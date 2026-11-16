// Where the editor settings are kept between sessions: localStorage in the page. Holds one JSON text, which
// EditorSettings checks key by key. Never throws: a store that can't be read reads as undefined, and a write
// that fails is lost.
export type SettingsStore = {
    read(): string | undefined;
    write(text: string): void;
};
