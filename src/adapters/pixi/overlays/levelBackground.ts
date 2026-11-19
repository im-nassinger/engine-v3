import { StyleComponent } from '../../../core/components/index.ts';
import type { SolidFill } from '../../../core/fields/index.ts';
import type { Level } from '../../../core/level/index.ts';

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

export function worldFillOf(level: Level) {
    return level.world.getComponent(StyleComponent)?.get('fill');
}

// No fill shows the app's dark colour behind the canvas, so it counts as dark.
export function isDarkBackground(background: SolidFill | undefined) {
    if (background === undefined || background.kind === 'none') return true;

    return isDarkColour(background.colour);
}
