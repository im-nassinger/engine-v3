import type { Unsubscribe } from '../../../core/events/index.ts';
import type { LevelWriter } from '../../../core/level-data/index.ts';
import type { EditorSession, OpenLevel } from '../../session/index.ts';
import type { Cancel, Clock, Timer } from '../../time/index.ts';

import type { LevelStore } from '../contracts/LevelStore.ts';
import { SaveState } from './SaveState.ts';

export type AutosaveOptions = {
    readonly session: EditorSession;
    readonly store: LevelStore;
    readonly writer: LevelWriter;
    readonly timer: Timer;
    readonly clock: Clock;
};

// What Autosave follows of the open level: its version, and its drags, which hold a save until they end.
type Followed = {
    readonly openLevel: OpenLevel;
    readonly stop: Unsubscribe;
    savedVersion: number;
};

// Saves the open level to the browser on its own: 2 s after the last change, and at most 20 s after the first
// unsaved one. A save due during a drag waits for the drag's end, and one save runs at a time. It follows the
// session, so New and Import need no new Autosave.
export class Autosave {
    static readonly quietDelayMs = 2_000;
    static readonly longestWaitMs = 20_000;
    readonly state = new SaveState();
    private readonly session: EditorSession;
    private readonly store: LevelStore;
    private readonly writer: LevelWriter;
    private readonly timer: Timer;
    private readonly clock: Clock;
    private readonly stopFollowingSession: Unsubscribe;
    private followed: Followed;
    private cancelQuiet: Cancel | undefined;
    private cancelLongest: Cancel | undefined;
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
        this.followed = this.follow(options.session.openLevel);
        this.followed.savedVersion = this.levelVersion();
        this.stopFollowingSession = options.session.openLevelChanged.subscribe(() => this.followNewLevel());
    }

    // For what can't wait for the timers: the tab hidden, test play starting, an export. Waits for a running
    // save, then saves if anything is unsaved, even during a drag. Resolves when it is written or failed.
    async saveNow(): Promise<void> {
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
        this.changed();
    }

    private changed() {
        if (this.running === undefined) {
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
        if (!this.due || this.running !== undefined) return;
        if (this.followed.openLevel.liveEdit.isActive) return;

        void this.save();
    }

    private async save() {
        this.cancelTimers();
        this.due = false;

        const followed = this.followed;
        const version = this.levelVersion();
        const levelJson = JSON.stringify(this.writer.write(followed.openLevel.level));
        this.state.set('saving');

        const running = this.write(followed, version, levelJson);
        this.running = running;
        await running;
        this.running = undefined;

        this.afterSave();
    }

    private async write(followed: Followed, version: number, levelJson: string) {
        try {
            await this.store.save({ levelJson, savedAtMs: this.clock.nowMs() });
            followed.savedVersion = version;
        } catch {
            this.state.set('failed');
        }
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
