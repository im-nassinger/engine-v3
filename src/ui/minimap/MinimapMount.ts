// What ui needs of the minimap: a canvas it can put in a box. MinimapView fulfils it without importing ui.
export type MinimapMount = {
    mount(host: HTMLElement): void;
    unmount(): void;
};
