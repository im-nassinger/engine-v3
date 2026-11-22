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
    // False when storage can't open, or when a damaged record couldn't be kept apart, so a save would
    // delete it. Autosave isn't started then.
    readonly canSave: boolean;
    // A new level, so the view fits its camera frame instead of the saved view.
    readonly isNew: boolean;
    readonly damaged: DamagedOpening | undefined;
    // The crash note, or `Nothing will be saved in this browser`.
    readonly statusText: string | undefined;
};

type Loaded = { readonly ok: true; readonly saved: SavedLevel | undefined } | { readonly ok: false };

// Opens the editor on the level saved in this browser: the level taken from any other tab first, which saves it
// before handing it over, then the saved record, read like
// an import. With no record it gives a new level; with storage that can't open, a new level that is never
// saved. A record that won't open is kept in the store's damaged record before the new level is saved over
// it, so it is never deleted. A session found still open, with a saved level, means the last one crashed.
export class LevelOpener {
    private readonly options: LevelOpenerOptions;

    constructor(options: LevelOpenerOptions) {
        this.options = options;
    }

    async open(): Promise<Opening> {
        const acquired = await this.options.tabGuard.acquire();
        // A level taken from a tab still open set sessionOpen there, so that is no crash.
        const crashed = acquired === 'free' && this.options.sessionOpen.isOpen;
        this.options.sessionOpen.setOpen(true);

        const loaded = await this.load();
        if (!loaded.ok) return newLevelOpening({ canSave: false, statusText: NOTHING_SAVED_TEXT });

        const saved = loaded.saved;
        if (saved === undefined) return newLevelOpening({ canSave: true, statusText: undefined });

        const outcome = this.options.reader.readJson(saved.levelJson);
        if (!outcome.ok) return this.openDamaged(saved, outcome.refusal);

        const statusText = crashed ? crashNoteText(saved.savedAtMs, this.options.timeOfDay) : undefined;

        return { level: outcome.value, canSave: true, isNew: false, damaged: undefined, statusText };
    }

    private async load(): Promise<Loaded> {
        try {
            const saved = await this.options.store.load();

            return { ok: true, saved };
        } catch {
            return { ok: false };
        }
    }

    private async openDamaged(saved: SavedLevel, refusal: ReadRefusal): Promise<Opening> {
        const damaged = { levelJson: saved.levelJson, refusal, noticeText: damagedNoticeText(refusal) };

        const kept = await this.keepDamaged({ ...saved, refusal });
        if (!kept) {
            return { ...newLevelOpening({ canSave: false, statusText: NOTHING_SAVED_TEXT }), damaged };
        }

        const opening = { ...newLevelOpening({ canSave: true, statusText: undefined }), damaged };
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

type NewLevelParts = Pick<Opening, 'canSave' | 'statusText'>;

function newLevelOpening(parts: NewLevelParts): Opening {
    return { ...parts, level: Level.createNew(), isNew: true, damaged: undefined };
}
