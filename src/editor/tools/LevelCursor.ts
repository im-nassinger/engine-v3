// The mouse cursor over the level view, as the active tool wants it; the browser adapter turns it into a
// CSS cursor. A resize's direction is the angle on screen, in degrees with y down, from the frame's
// centre out through the handle, so a turned frame's handles show turned arrows.
export type LevelCursor =
    | { readonly kind: 'default' }
    | { readonly kind: 'rotate' }
    | { readonly kind: 'resize'; readonly directionDegrees: number };

export const DEFAULT_CURSOR: LevelCursor = { kind: 'default' };
export const ROTATE_CURSOR: LevelCursor = { kind: 'rotate' };
