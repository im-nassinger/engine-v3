import { Level } from '../../../core/level/index.ts';
import type { LevelReader, LevelWriter, ReadRefusal } from '../../../core/level-data/index.ts';
import type { Clock, TimeOfDay } from '../../time/index.ts';

import type { DamagedLevel, LevelStore, SavedLevel } from '../contracts/LevelStore.ts';
import type { SessionOpenRecord } from '../contracts/SessionOpenRecord.ts';
import type { TabGuard } from '../contracts/TabGuard.ts';
import { NOTHING_SAVED_TEXT, crashNoteText, damagedNoticeText } from './openingTexts.ts';

export type LevelOpenerOptions = {
    readonly tabGuard: TabGuard;
    readonly store: LevelStore;
    readonly reader: LevelReader;
    readonly writer: LevelWriter;
    readonly sessionOpen: SessionOpenRecord;
    readonly clock: Clock;
    readonly timeOfDay: TimeOfDay;
};

// A saved level that wouldn't open: its raw text, for Export raw data, and the notice's text.
export type DamagedOpening = {
    readonly levelJson: string;
    readonly refusal: ReadRefusal;
    readonly noticeText: string;
};

// What the page builds the editor from.
export type Opening = {
    readonly level: Level;
    // Another tab holds the lock: the session is made read-only and nothing is saved.
    readonly readOnly: boolean;
    // False when read-only, when storage can't open, or when a damaged record couldn't be kept apart, so
    // a save would delete it. Autosave isn't started then.
    readonly canSave: boolean;
    // A new level, so the view fits its camera frame instead of the saved view.
    readonly isNew: boolean;
    readonly damaged: DamagedOpening | undefined;
    // The crash note, or `Nothing will be saved in this browser`.
    readonly statusText: string | undefined;
};

type Loaded = { readonly ok: true; readonly saved: SavedLevel | undefined } | { readonly ok: false };

// Opens the editor on the level saved in this browser: the tab's lock first, then the saved record, read like
// an import. With no record it gives a new level; with storage that can't open, a new level that is never
// saved. A record that won't open is kept in the store's damaged record before the new level is saved over
// it, so it is never deleted. A session found still open, with a saved level, means the last one crashed.
export class LevelOpener {
    private readonly options: LevelOpenerOptions;

    constructor(options: LevelOpenerOptions) {
        this.options = options;
    }

    async open(): Promise<Opening> {
        const hasLock = await this.options.tabGuard.acquire();
        const readOnly = !hasLock;
        // Only the tab with the lock keeps sessionOpen, or a read-only tab closing would hide the other's crash.
        const crashed = !readOnly && this.options.sessionOpen.isOpen;
        if (!readOnly) {
            this.options.sessionOpen.setOpen(true);
        }

        const loaded = await this.load();
        if (!loaded.ok) return newLevelOpening({ readOnly, canSave: false, statusText: NOTHING_SAVED_TEXT });

        const saved = loaded.saved;
        if (saved === undefined) return newLevelOpening({ readOnly, canSave: !readOnly, statusText: undefined });

        const outcome = this.options.reader.readJson(saved.levelJson);
        if (!outcome.ok) return this.openDamaged(saved, outcome.refusal, readOnly);

        const statusText = crashed ? crashNoteText(saved.savedAtMs, this.options.timeOfDay) : undefined;

        return { level: outcome.value, readOnly, canSave: !readOnly, isNew: false, damaged: undefined, statusText };
    }

    private async load(): Promise<Loaded> {
        try {
            const saved = await this.options.store.load();

            return { ok: true, saved };
        } catch {
            return { ok: false };
        }
    }

    // A read-only tab writes nothing: the tab with the lock keeps the record.
    private async openDamaged(saved: SavedLevel, refusal: ReadRefusal, readOnly: boolean): Promise<Opening> {
        const damaged = { levelJson: saved.levelJson, refusal, noticeText: damagedNoticeText(refusal) };
        if (readOnly) return { ...newLevelOpening({ readOnly, canSave: false, statusText: undefined }), damaged };

        const kept = await this.keepDamaged({ ...saved, refusal });
        if (!kept) {
            return { ...newLevelOpening({ readOnly, canSave: false, statusText: NOTHING_SAVED_TEXT }), damaged };
        }

        const opening = { ...newLevelOpening({ readOnly, canSave: true, statusText: undefined }), damaged };
        await this.saveNewLevel(opening.level);

        return opening;
    }

    private async keepDamaged(level: DamagedLevel) {
        try {
            await this.options.store.keepDamaged(level);

            return true;
        } catch {
            return false;
        }
    }

    // A save that fails here is made again by Autosave after the next change; the damaged record is kept either way.
    private async saveNewLevel(level: Level) {
        const levelJson = JSON.stringify(this.options.writer.write(level));

        try {
            await this.options.store.save({ levelJson, savedAtMs: this.options.clock.nowMs() });
        } catch {
            // Nothing to undo: the store still holds the old record, and its copy is kept.
        }
    }
}

type NewLevelParts = Pick<Opening, 'readOnly' | 'canSave' | 'statusText'>;

function newLevelOpening(parts: NewLevelParts): Opening {
    return { ...parts, level: Level.createNew(), isNew: true, damaged: undefined };
}
