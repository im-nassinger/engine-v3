import type { LengthDisplay } from '../units/index.ts';

// One coordinate of the mouse in ☰'s unit, metres to the pixel or whole pixels, with the minus sign the
// editor's texts use and never "−0". Nothing while the mouse is outside the level view.
export function mouseCoordinateText(coordinate: number | undefined, lengths: LengthDisplay) {
    if (coordinate === undefined) return '';

    const text = lengths.lengthText(coordinate);

    return text.replace('-', '−');
}
