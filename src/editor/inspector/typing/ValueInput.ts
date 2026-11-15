import type { AngleFieldType, NumberFieldType, Unit, VectorFieldType } from '../../../core/fields/index.ts';

// A vector field has a box per axis, and each box is typed like a number.
export type NumberInputType = NumberFieldType | AngleFieldType | VectorFieldType;

// What ValueInput needs of a field: a stored field or a derived one both fit.
export type NumberInputDefinition = {
    readonly label: string;
    readonly type: NumberInputType;
    readonly unit?: Unit;
    readonly displayScale?: number;
    readonly precision?: number;
};

// What showing a number needs: a read-only row, such as Mass, has no field type.
export type NumberDisplay = Pick<NumberInputDefinition, 'displayScale' | 'precision'>;

export type ValueInputResult =
    // note: "Max is 1500" after clamping.
    | { readonly kind: 'value'; readonly value: number; readonly note?: string }
    // Empty text: back to the old value.
    | { readonly kind: 'restore' }
    // Red outline, and Enter does nothing.
    | { readonly kind: 'invalid'; readonly reason: string };

export type ColourInputResult =
    | { readonly kind: 'value'; readonly value: string }
    | { readonly kind: 'restore' }
    | { readonly kind: 'invalid'; readonly reason: string };

const LARGEST_TYPED_NUMBER = 1e9;
const DEFAULT_PRECISION = 2;
// Enough digits to show any stored value in full, without the float noise a display scale adds (0.1 * 100).
const FULL_VALUE_DIGITS = 15;

const COLOUR_CODE = /^#?([0-9A-F]{6})([0-9A-F]{2})?$/i;
const OPAQUE = 'FF';

const DECIMAL_NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

export class ValueInput {
    static parseNumber(text: string, definition: NumberInputDefinition): ValueInputResult {
        const typedNumber = readTypedNumber(text, definition.unit);
        if (typedNumber === 'empty') return { kind: 'restore' };
        if (typedNumber === undefined) return { kind: 'invalid', reason: 'Not a number' };

        const isTooLarge = Math.abs(typedNumber) > LARGEST_TYPED_NUMBER;
        if (isTooLarge) return { kind: 'invalid', reason: 'Too large' };

        const displayScale = definition.displayScale ?? 1;
        const typedValue = typedNumber / displayScale;

        const refusal = refusalOf(typedValue, definition);
        if (refusal !== undefined) return { kind: 'invalid', reason: refusal };

        return clampedValue(typedValue, definition);
    }

    // A colour code, with or without its #, in any case. Six digits keep the old colour's see-through
    // part, or are opaque when there is none (Mixed). Stored as #RRGGBBAA in capitals.
    static parseColour(text: string, oldColour: string | undefined): ColourInputResult {
        const typedCode = text.trim();
        if (typedCode === '') return { kind: 'restore' };

        const match = COLOUR_CODE.exec(typedCode);
        if (match === null) return { kind: 'invalid', reason: 'Not a colour code' };

        const rgb = match[1] as string;
        const alpha = match[2] ?? alphaOf(oldColour);
        const code = `#${rgb}${alpha}`;

        return { kind: 'value', value: code.toUpperCase() };
    }

    // The browser's picker knows no see-through part: its #rrggbb keeps the old colour's.
    static withPickedColour(pickedRgb: string, oldColour: string | undefined) {
        const alpha = alphaOf(oldColour);
        const code = `${pickedRgb}${alpha}`;

        return code.toUpperCase();
    }

    // Up to the field's decimals, without trailing zeros and without the unit, which the field shows faded.
    static format(value: number, definition: NumberDisplay) {
        const displayScale = definition.displayScale ?? 1;
        const precision = definition.precision ?? DEFAULT_PRECISION;
        const shownValue = value * displayScale;
        const fixedText = shownValue.toFixed(precision);
        const shownNumber = Number(fixedText);

        return numberText(shownNumber);
    }

    // What a focused field shows: the stored value in full.
    static formatFull(value: number, definition: NumberDisplay) {
        const displayScale = definition.displayScale ?? 1;
        const shownValue = value * displayScale;
        const fullText = shownValue.toPrecision(FULL_VALUE_DIGITS);
        const shownNumber = Number(fullText);

        return numberText(shownNumber);
    }
}

function alphaOf(colour: string | undefined) {
    if (colour === undefined) return OPAQUE;

    return colour.slice(7, 9);
}

// 'empty' for nothing typed, undefined for text that can't be read.
function readTypedNumber(text: string, unit: Unit | undefined) {
    let numberText = text.trim();
    if (unit !== undefined && numberText.endsWith(unit)) {
        numberText = numberText.slice(0, -unit.length).trim();
    }
    if (numberText === '') return 'empty';

    // The level's texts write minus as U+2212, so it may be pasted back.
    const withMinus = numberText.replace('−', '-');
    const withPoint = withMinus.replace(',', '.');
    if (!DECIMAL_NUMBER.test(withPoint)) return undefined;

    return Number(withPoint);
}

function refusalOf(value: number, definition: NumberInputDefinition) {
    const type = definition.type;

    const refusesZero = type.kind === 'vector' && type.refuseZero;
    if (refusesZero && value === 0) return `${definition.label} can't be 0`;

    const refusesLimits = type.kind === 'angle' && type.refuseLimits;
    if (!refusesLimits) return undefined;

    const min = type.min ?? -Infinity;
    const max = type.max ?? Infinity;
    const isInsideLimits = value > min && value < max;
    if (isInsideLimits) return undefined;

    const minText = limitText(min, definition);
    const maxText = limitText(max, definition);
    return `${definition.label} must be between ${minText} and ${maxText}`;
}

function clampedValue(typedValue: number, definition: NumberInputDefinition): ValueInputResult {
    const type = definition.type;

    let value = typedValue;
    const roundsToWhole = type.kind === 'number' && type.wholeNumber;
    if (roundsToWhole) {
        value = Math.round(value);
    }

    const min = type.min ?? -Infinity;
    const max = type.max ?? Infinity;

    if (value > max) {
        const maxText = ValueInput.format(max, definition);
        return { kind: 'value', value: max, note: `Max is ${maxText}` };
    }
    if (value < min) {
        const minText = ValueInput.format(min, definition);
        return { kind: 'value', value: min, note: `Min is ${minText}` };
    }

    return { kind: 'value', value };
}

function limitText(limit: number, definition: NumberInputDefinition) {
    const formatted = ValueInput.format(limit, definition);
    const withMinus = formatted.replace('-', '−');

    return `${withMinus}${definition.unit ?? ''}`;
}

// Never "-0": a value rounded to zero reads as 0.
function numberText(value: number) {
    if (value === 0) return '0';

    return String(value);
}
