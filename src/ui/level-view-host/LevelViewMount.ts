// What ui needs of the level view: a canvas it can put in a box. PixiLevelView fulfils it without importing ui.
export type LevelViewMount = {
    // Puts the canvas in the host, or moves it there.
    mount(host: HTMLElement): void;
    unmount(): void;
};
