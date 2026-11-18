import type { Point } from '../../../core/geometry/index.ts';

// One decimal at most, so a drag at a high zoom still reads plainly.
const DECIMALS = 1;

// A minus sign, as the rest of the editor's texts write it, and never "−0".
function numberText(value: number) {
    const rounded = Number(value.toFixed(DECIMALS)) + 0;
    if (rounded < 0) return `−${String(-rounded)}`;

    return String(rounded);
}

// The distance moved, in level pixels: `120, −40 px`.
export function moveReadout(offset: Point) {
    return `${numberText(offset.x)}, ${numberText(offset.y)} px`;
}

// The new size, in the pixels the Entity inspector shows: `200 × 100 px`.
export function sizeReadout(size: Point) {
    return `${numberText(size.x)} × ${numberText(size.y)} px`;
}

// The new Rotation: `45°`.
export function angleReadout(degrees: number) {
    return `${numberText(degrees)}°`;
}

// A circle's size, across: `⌀ 100 px`.
export function diameterReadout(diameter: number) {
    return `⌀ ${numberText(diameter)} px`;
}
