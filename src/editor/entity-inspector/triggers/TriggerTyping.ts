import { ColourFieldType, NumberFieldType, TextFieldType, VectorFieldType } from '../../../core/fields/index.ts';
import type { JsonValue, Unit, ValueType } from '../../../core/fields/index.ts';

import { ValueInput } from '../typing/ValueInput.ts';
import type { TriggerWordEntry } from './TriggerWord.ts';

type TypedEntry = Exclude<TriggerWordEntry, { readonly kind: 'menu' }>;

// value: what TriggerEdits.typed takes. restore: nothing typed, the word keeps its value. invalid: the box
// turns red with the reason and Enter does nothing.
export type TriggerTypingResult =
    | { readonly kind: 'value'; readonly value: JsonValue }
    | { readonly kind: 'restore' }
    | { readonly kind: 'invalid'; readonly reason: string };

const ANY_NUMBER = new NumberFieldType();
const VECTOR_PARTS = /^\s*([^,;\s]+)\s*[,;\s]\s*([^,;\s]+)\s*$/;

// Reads what is typed into a word's small field: a number (seconds, a compared number, a kick), or a value
// of another type (a colour code, a vector as "x, y", a text), checked by that type.
export class TriggerTyping {
    // The text the field starts with.
    static shownText(entry: TypedEntry) {
        const { value } = entry;
        if (value === null) return '';
        if (typeof value === 'number' || typeof value === 'string') return String(value);
        if (isPoint(value)) return `${value.x}, ${value.y}`;

        return '';
    }

    static parse(entry: TypedEntry, text: string): TriggerTypingResult {
        if (entry.kind === 'number') return parseNumber(text, entry.unit);

        return parseValue(text, entry.value, entry.valueType);
    }
}

function parseNumber(text: string, unit: Unit | undefined): TriggerTypingResult {
    const result = ValueInput.parseNumber(text, { label: 'The number', type: ANY_NUMBER, unit });
    if (result.kind !== 'value') return result;

    return { kind: 'value', value: result.value };
}

function parseValue(text: string, oldValue: JsonValue | null, valueType: ValueType<unknown>): TriggerTypingResult {
    if (text.trim() === '') return { kind: 'restore' };

    if (valueType instanceof ColourFieldType) {
        const oldColour = typeof oldValue === 'string' ? oldValue : undefined;
        return ValueInput.parseColour(text, oldColour);
    }
    if (valueType instanceof VectorFieldType) return parseVector(text, valueType);
    if (valueType instanceof TextFieldType) return checked(text.trim(), valueType);

    return { kind: 'invalid', reason: "Can't be typed here" };
}

function parseVector(text: string, valueType: VectorFieldType): TriggerTypingResult {
    const match = VECTOR_PARTS.exec(text);
    if (match === null) return { kind: 'invalid', reason: 'Type two numbers, such as 0, 100' };

    const x = parseNumber(match[1] as string, undefined);
    const y = parseNumber(match[2] as string, undefined);
    if (x.kind !== 'value' || y.kind !== 'value') return { kind: 'invalid', reason: 'Not a number' };

    const point = { x: x.value, y: y.value };
    return checked(point, valueType);
}

function checked(value: JsonValue, valueType: ValueType<unknown>): TriggerTypingResult {
    const outcome = valueType.parse(value);
    if (!outcome.ok) return { kind: 'invalid', reason: 'Not a valid value' };

    return { kind: 'value', value };
}

function isPoint(value: JsonValue): value is { readonly x: number; readonly y: number } {
    if (typeof value !== 'object' || value === null) return false;
    if (!('x' in value) || !('y' in value)) return false;

    return typeof value.x === 'number' && typeof value.y === 'number';
}
