import type { NumberInputDefinition } from '../../../../editor/entity-inspector/index.ts';

export type SliderRange = {
    readonly min: number;
    readonly max: number;
};

const DEFAULT_PRECISION = 2;
const MOST_DECIMALS = 12;

// The smallest change the box shows: a drag never makes a value with more decimals than the field.
export function sliderStepOf(definition: NumberInputDefinition) {
    const { type } = definition;
    if (type.kind === 'number' && type.wholeNumber) return 1;

    const precision = definition.precision ?? DEFAULT_PRECISION;
    const displayScale = definition.displayScale ?? 1;
    const shownStep = 10 ** -precision;

    return shownStep / displayScale;
}

// How much of the field is filled for this value, from 0 to 1. Mixed (undefined) fills nothing.
export function filledShareOf(value: number | undefined, range: SliderRange) {
    if (value === undefined) return 0;

    const share = (value - range.min) / (range.max - range.min);

    return clamp(share, 0, 1);
}

// The value under the pointer: the field's left edge is the minimum and its right edge the maximum,
// on the slider's step.
export function sliderValueAt(pointerX: number, left: number, width: number, range: SliderRange, step: number) {
    const share = clamp((pointerX - left) / width, 0, 1);
    const steps = Math.round((share * (range.max - range.min)) / step);
    const value = clamp(range.min + steps * step, range.min, range.max);
    const decimals = Math.min(MOST_DECIMALS, Math.max(0, Math.ceil(-Math.log10(step))));

    return Number(value.toFixed(decimals));
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}
