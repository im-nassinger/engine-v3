// The page reports whether a menu or window is open. It closes itself on Esc, so the chain only
// needs to know that one answered.
export type OpenWindows = {
    isOpen(): boolean;
};
