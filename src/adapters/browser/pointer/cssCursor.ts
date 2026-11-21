import type { LevelCursor } from '../../../editor/tools/index.ts';

// CSS has no turning arrow, so it is drawn: a dark arc nearly all the way round, with an arrowhead, on a
// white edge so it shows on any colour. Its hot spot is its middle.
const ROTATE_ARROW_SVG = [
    "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'>",
    "<path d='M5 12 A7 7 0 1 1 7.05 16.95' fill='none' stroke='white' stroke-width='4'/>",
    "<path d='M4.93 14.83 L9.17 14.83 L4.93 19.07 Z' fill='white' stroke='white' stroke-width='2' stroke-linejoin='round'/>",
    "<path d='M5 12 A7 7 0 1 1 7.05 16.95' fill='none' stroke='%231d2430' stroke-width='2'/>",
    "<path d='M4.93 14.83 L9.17 14.83 L4.93 19.07 Z' fill='%231d2430'/>",
    '</svg>',
].join('');
const ROTATE_CSS = `url("data:image/svg+xml,${ROTATE_ARROW_SVG}") 12 12, auto`;

// CSS's four two-way arrows, every 45° from pointing right, y down.
const RESIZE_CURSORS = ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize'] as const;
const DEGREES_PER_ARROW = 45;

// The CSS cursor for the level view. A turned handle gets the nearest of the four two-way arrows, as the
// tech notes say CSS has no others. The empty string leaves the page's own cursor.
export function cssCursor(cursor: LevelCursor) {
    if (cursor.kind === 'rotate') return ROTATE_CSS;
    if (cursor.kind === 'default') return '';

    const arrowIndex = Math.round(cursor.directionDegrees / DEGREES_PER_ARROW);
    const arrowCount = RESIZE_CURSORS.length;
    const wrappedIndex = ((arrowIndex % arrowCount) + arrowCount) % arrowCount;

    return RESIZE_CURSORS[wrappedIndex] ?? '';
}
