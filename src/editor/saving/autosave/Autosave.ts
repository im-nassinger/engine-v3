import type { Unsubscribe } from '../../../core/events/index.ts';
import { V1_LEVEL_LIMITS } from '../../../core/level-data/index.ts';
import type { LevelLimits, LevelWriter } from '../../../core/level-data/index.ts';
import type { EditorMessage } from '../../messages/index.ts';
import type { EditorSession, OpenLevel } from '../../session/index.ts';
import type { Cancel, Clock, Timer } from '../../time/index.ts';

import type { LevelStore, SaveWrite } from '../contracts/LevelStore.ts';
import type { PersistAskedRecord } from '../contracts/PersistAskedRecord.ts';
import type { StoragePersistence } from '../contracts/StoragePersistence.ts';
import { SaveState } from './SaveState.ts';
import { fitsWithoutCounting, utf8Length } from './utf8Length.ts';

export type AutosaveOptions = {
    readonly session: EditorSession;
    readonly store: LevelStore;
    readonly writer: LevelWriter;
    readonly timer: Timer;
    readonly clock: Clock;
    readonly persistence: StoragePersistence;
    readonly persistAsked: PersistAskedRecord;
    // V1_LEVEL_LIMITS when not given; only maxBytes is read.
    readonly limits?: LevelLimits;
};

export const SAVE_FAILED_TEXT =
    'Saving in this browser failed. Your changes are kept while this tab is open, and Export still works';
export const OVER_SIZE_TEXT = "This level is over 256 MB and can't be saved. Delete something to save it again";
export const DATA_CLEARED_TEXT = "The browser's saved data was cleared. The level was saved again";
// The source of Autosave's level-wide editor message.
export const SAVING_MESSAGE_SOURCE = 'saving';

// What Autosave follows of the open level: its version, and its drags, which hold a save until they end.
type Followed = {
    readonly openLevel: OpenLevel;
    readonly stop: Unsubscribe;
    savedVersion: number;
};

// Saves the open level to the browser on its own: 2 s after the last change, and at most 20 s after the first
// unsaved one. A save due during a drag waits for the drag's end, and one save runs at a time. It follows the
// session, so New and Import need no new Autosave. A failed save shows a level-wide editor message and is
// tried again every 10 s until one works. A read-only tab never saves, so it can't overwrite the level
// another tab is editing.
export class Autosave {
    static readonly quietDelayMs = 2_000;
    static readonly longestWaitMs = 20_000;
    static readonly retryMs = 10_000;
    readonly state = new SaveState();
    private readonly session: EditorSession;
    private readonly store: LevelStore;
    private readonly writer: LevelWriter;
    private readonly timer: Timer;
    private readonly clock: Clock;
    private readonly persistence: StoragePersistence;
    private readonly persistAsked: PersistAskedRecord;
    private readonly maxBytes: number;
    private readonly stopFollowingSession: Unsubscribe;
    private followed: Followed;
    private cancelQuiet: Cancel | undefined;
    private cancelLongest: Cancel | undefined;
    private cancelRetry: Cancel | undefined;
    // The level-wide message shown now, kept to show it again on a level opened while it stands.
    private messageText: string | undefined;
    // A save worked since the editor opened, so a store found empty after it was cleared meanwhile.
    private hasSaved = false;
    // A timer fell due while a save ran or a drag held the mouse.
    private due = false;
    private running: Promise<void> | undefined;

    // The open level as it is now is taken to be what the store holds.
    constructor(options: AutosaveOptions) {
        this.session = options.session;
        this.store = options.store;
        this.writer = options.writer;
        this.timer = options.timer;
        this.clock = options.clock;
        this.persistence = options.persistence;
        this.persistAsked = options.persistAsked;
        this.maxBytes = (options.limits ?? V1_LEVEL_LIMITS).maxBytes;
        this.followed = this.follow(options.session.openLevel);
        this.followed.savedVersion = this.levelVersion();
        this.stopFollowingSession = options.session.openLevelChanged.subscribe(() => this.followNewLevel());
    }

    // For what can't wait for the timers: the tab hidden, test play starting, an export. Waits for a running
    // save, then saves if anything is unsaved, even during a drag. Resolves when it is written or failed.
    async saveNow(): Promise<void> {
        if (this.session.readOnly) return;
        if (this.running !== undefined) {
            await this.running;
        }
        if (!this.hasUnsavedChanges()) return;

        await this.save();
    }

    dispose() {
        this.stopFollowingSession();
        this.followed.stop();
        this.cancelTimers();
        this.cancelRetry?.();
        this.cancelRetry = undefined;
    }

    private follow(openLevel: OpenLevel): Followed {
        const stopLevel = openLevel.level.signals.levelVersion.subscribe(() => this.changed());
        const stopDrag = openLevel.liveEdit.activeChanged.subscribe(() => this.dragChanged());
        const stop = () => {
            stopLevel();
            stopDrag();
        };

        return { openLevel, stop, savedVersion: -1 };
    }

    // A new level is unsaved until it is saved: the store still holds the old one.
    private followNewLevel() {
        this.followed.stop();
        this.cancelTimers();
        this.due = false;
        this.followed = this.follow(this.session.openLevel);
        this.showMessage(this.messageText);
        this.changed();
    }

    // A failed save stays failed until a save works, whatever changes meanwhile.
    private changed() {
        if (this.session.readOnly) return;

        if (this.running === undefined && this.state.status !== 'failed') {
            this.state.set('unsaved');
        }

        this.cancelQuiet?.();
        this.cancelQuiet = this.timer.after(Autosave.quietDelayMs, () => this.fallDue());
        this.cancelLongest ??= this.timer.after(Autosave.longestWaitMs, () => this.fallDue());
    }

    private dragChanged() {
        if (this.followed.openLevel.liveEdit.isActive) return;

        this.startIfDue();
    }

    private fallDue() {
        this.cancelTimers();
        this.due = true;
        this.startIfDue();
    }

    private startIfDue() {
        if (this.session.readOnly) return;
        if (!this.due || this.running !== undefined) return;
        if (this.followed.openLevel.liveEdit.isActive) return;

        void this.save();
    }

    private async save() {
        this.cancelTimers();
        this.cancelRetry?.();
        this.cancelRetry = undefined;
        this.due = false;

        const followed = this.followed;
        const version = this.levelVersion();
        const levelJson = JSON.stringify(this.writer.write(followed.openLevel.level));
        if (!this.fits(levelJson)) {
            this.fail(OVER_SIZE_TEXT);
            return;
        }
        this.state.set('saving');

        const running = this.write(followed, version, levelJson);
        this.running = running;
        await running;
        this.running = undefined;

        this.afterSave();
    }

    private fits(levelJson: string) {
        return fitsWithoutCounting(levelJson, this.maxBytes) || utf8Length(levelJson) <= this.maxBytes;
    }

    private async write(followed: Followed, version: number, levelJson: string) {
        let write: SaveWrite;
        try {
            write = await this.store.save({ levelJson, savedAtMs: this.clock.nowMs() });
        } catch {
            this.fail(SAVE_FAILED_TEXT);
            this.cancelRetry = this.timer.after(Autosave.retryMs, () => this.retry());
            return;
        }

        followed.savedVersion = version;
        this.worked(write);
    }

    // An over-size level isn't tried again on a timer: only a change can make it fit.
    private fail(text: string) {
        this.state.set('failed');
        this.showMessage(text);
    }

    private retry() {
        this.cancelRetry = undefined;
        this.due = true;
        this.startIfDue();
    }

    // The state is set after, by afterSave, since a change during the save leaves the level unsaved.
    private worked(write: SaveWrite) {
        this.showMessage(undefined);
        if (write === 'wroteNew' && this.hasSaved) {
            this.session.status.show(DATA_CLEARED_TEXT);
        }
        this.hasSaved = true;
        this.askToPersist();
    }

    // Once ever: a browser that refuses needs no message.
    private askToPersist() {
        if (this.persistAsked.isAsked) return;

        this.persistAsked.markAsked();
        void this.persistence.persist();
    }

    private showMessage(text: string | undefined) {
        this.messageText = text;
        const messages = text === undefined ? [] : [levelWideWarning(text)];
        this.session.openLevel.messages.setLevelWide(SAVING_MESSAGE_SOURCE, messages);
    }

    // A change during the save leaves the level unsaved, and a timer that fell due meanwhile saves it now.
    private afterSave() {
        if (this.state.status !== 'failed') {
            this.state.set(this.hasUnsavedChanges() ? 'unsaved' : 'saved');
        }

        this.startIfDue();
    }

    private hasUnsavedChanges() {
        return this.followed.savedVersion !== this.levelVersion();
    }

    private levelVersion() {
        return this.followed.openLevel.level.signals.levelVersion.version;
    }

    private cancelTimers() {
        this.cancelQuiet?.();
        this.cancelQuiet = undefined;
        this.cancelLongest?.();
        this.cancelLongest = undefined;
    }
}

function levelWideWarning(text: string): EditorMessage {
    return {
        kind: 'warning',
        entityId: undefined,
        componentType: undefined,
        fieldKey: undefined,
        text,
        fix: undefined,
    };
}
