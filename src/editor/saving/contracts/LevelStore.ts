// The level as it is kept in the browser: level.json's text and when it was written.
export type SavedLevel = {
    readonly levelJson: string;
    readonly savedAtMs: number;
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
};
