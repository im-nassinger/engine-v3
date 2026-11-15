import type { SolidFill } from '../../../../core/fields/index.ts';

const LIGHT_BACKGROUND_LINES = 0x1e3c5f;
const DARK_BACKGROUND_LINES = 0xffffff;
const LARGEST_CHANNEL = 255;

function channel(storedColour: string, start: number) {
    const digits = storedColour.slice(start, start + 2);

    return Number.parseInt(digits, 16) / LARGEST_CHANNEL;
}

// Brightness as 0.299 R + 0.587 G + 0.114 B, from 0 to 1. A background under half is dark.
export function isDarkColour(storedColour: string) {
    const red = channel(storedColour, 1);
    const green = channel(storedColour, 3);
    const blue = channel(storedColour, 5);
    const brightness = 0.299 * red + 0.587 * green + 0.114 * blue;

    return brightness < 0.5;
}

// The grid's colour on this background: dark lines, or white ones on a dark background, at the same
// strengths. No fill shows the page behind the canvas, which is light.
export function gridColourFor(background: SolidFill | undefined) {
    if (background === undefined || background.kind === 'none') return LIGHT_BACKGROUND_LINES;
    if (isDarkColour(background.colour)) return DARK_BACKGROUND_LINES;

    return LIGHT_BACKGROUND_LINES;
}
