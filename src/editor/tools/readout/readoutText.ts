import type { Point } from '../../../core/geometry/index.ts';
import { lengthDisplayOf } from '../../units/index.ts';
import type { LengthDisplay } from '../../units/index.ts';
import type { ToolContext } from '../Tool.ts';

// One decimal at most, so a drag at a high zoom still reads plainly.
const DECIMALS = 1;

// How the open level's lengths show now, for a tool's readout.
export function readoutLengths(context: ToolContext) {
    return lengthDisplayOf(context.viewSettings.lengthUnit, context.openLevel.level);
}

// A minus sign, as the rest of the editor's texts write it, and never "−0".
function numberText(value: number) {
    const rounded = Number(value.toFixed(DECIMALS)) + 0;
    if (rounded < 0) return `−${String(-rounded)}`;

    return String(rounded);
}

// A length in ☰'s unit: metres to the pixel, or pixels to one decimal.
function lengthText(pixels: number, lengths: LengthDisplay) {
    if (!lengths.isMetres) return numberText(pixels);

    const text = lengths.lengthText(pixels);
    return text.replace('-', '−');
}

// The distance moved: `1.2, −0.4 m`, or `120, −40 px` in pixels.
export function moveReadout(offset: Point, lengths: LengthDisplay) {
    const x = lengthText(offset.x, lengths);
    const y = lengthText(offset.y, lengths);

    return `${x}, ${y} ${lengths.lengthUnit}`;
}

// The new size, as the Entity inspector shows it: `2 × 1 m`, or `200 × 100 px` in pixels.
export function sizeReadout(size: Point, lengths: LengthDisplay) {
    const width = lengthText(size.x, lengths);
    const height = lengthText(size.y, lengths);

    return `${width} × ${height} ${lengths.lengthUnit}`;
}

// The new Rotation: `45°`.
export function angleReadout(degrees: number) {
    return `${numberText(degrees)}°`;
}

// A circle's size, across: `⌀ 1 m`, or `⌀ 100 px` in pixels.
export function diameterReadout(diameter: number, lengths: LengthDisplay) {
    const across = lengthText(diameter, lengths);

    return `⌀ ${across} ${lengths.lengthUnit}`;
}
