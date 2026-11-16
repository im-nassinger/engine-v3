import type { ReadRefusal } from '../../../core/level-data/index.ts';

// The level as it is kept in the browser: level.json's text and when it was written.
export type SavedLevel = {
    readonly levelJson: string;
    readonly savedAtMs: number;
};

// A saved level that wouldn't open, kept in its own record with the reader's refusal, so the editor can save
// a new level without deleting it.
export type DamagedLevel = SavedLevel & {
    readonly refusal: ReadRefusal;
};

// Whether a save found the last one there (replaced) or an empty store (wroteNew), which after the first save
// of an opening means the browser's site data was cleared.
export type SaveWrite = 'replaced' | 'wroteNew';

// Where the level is kept between sessions: IndexedDB in the page. A save is all or nothing: it fully replaces
// the last one or rejects and leaves it as it was.
export type LevelStore = {
    // Undefined when nothing was saved yet. Rejects when storage can't be opened.
    load(): Promise<SavedLevel | undefined>;
    save(level: SavedLevel): Promise<SaveWrite>;
    // Replaces the damaged record kept before, if any. Never touches the level's own record.
    keepDamaged(level: DamagedLevel): Promise<void>;
};
