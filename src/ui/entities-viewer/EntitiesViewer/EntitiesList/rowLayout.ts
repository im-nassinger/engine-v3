// The --row token. The virtual list needs it as a number to place rows without measuring them.
export const ROW_HEIGHT = 30;

// The left padding before the World's fold arrow, and the --indent token per level below it.
const START_PADDING = 8;
const INDENT = 16;

// Where a row of this depth starts its fold arrow, and where a drop line at this depth starts.
export function indentAt(depth: number) {
    return START_PADDING + depth * INDENT;
}

// The depth whose indent the pointer is past: left of the World's fold arrow is 0.
export function depthAtIndent(x: number) {
    const depth = Math.floor((x - START_PADDING) / INDENT);

    return Math.max(depth, 0);
}
