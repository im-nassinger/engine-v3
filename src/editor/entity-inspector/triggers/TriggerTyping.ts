import {
    ColourFieldType,
    MAX_STRING_VARIABLE_LENGTH,
    NumberFieldType,
    TextFieldType,
    VectorFieldType,
    wordName,
} from '../../../core/fields/index.ts';
import type { JsonValue, Unit, ValueType } from '../../../core/fields/index.ts';

import { isReservedEventName } from '../../../core/triggers/index.ts';

import { ValueInput } from '../typing/ValueInput.ts';
import type { TriggerTypedEntry } from './TriggerWord.ts';

// value: what TriggerEdits.typed takes. restore: nothing typed, the word keeps its value. invalid: the box
// turns red with the reason and Enter does nothing.
export type TriggerTypingResult =
    | { readonly kind: 'value'; readonly value: JsonValue }
    | { readonly kind: 'restore' }
    | { readonly kind: 'invalid'; readonly reason: string };

const ANY_NUMBER = new NumberFieldType();
const ANY_VECTOR = new VectorFieldType();
const VECTOR_PARTS = /^\s*([^,;\s]+)\s*[,;\s]\s*([^,;\s]+)\s*$/;

// Reads what is typed into a word's small field: a number (seconds, a compared number, a kick), a value of
// another type (a colour code, a vector as "x, y", a text) checked by that type, a string variable's text
// (empty is a value), or a custom event's name, one word as a tag is.
export class TriggerTyping {
    // The text the field starts with.
    static shownText(entry: TriggerTypedEntry) {
        const { value } = entry;
        if (value === null) return '';
        if (entry.kind === 'number' && typeof value === 'number') return ValueInput.formatFull(value, entry);
        if (typeof value === 'number' || typeof value === 'string') return String(value);
        if (isPoint(value)) return `${value.x}, ${value.y}`;

        return '';
    }

    // One axis of the vector boxes, a length or a speed in ☰'s unit; empty while the vector is unset.
    static axisText(entry: TriggerTypedEntry & { kind: 'vector' }, axis: 'x' | 'y') {
        if (entry.value === null) return '';

        return ValueInput.formatFull(entry.value[axis], entry);
    }

    static parse(entry: TriggerTypedEntry, text: string): TriggerTypingResult {
        switch (entry.kind) {
            case 'number':
                return parseNumber(text, entry);
            case 'text':
                return parseText(text);
            case 'word':
                return parseWord(text);
            case 'value':
                return parseValue(text, entry.value, entry.valueType);
            case 'vector':
                return parseVector(text, ANY_VECTOR);
            case 'colour':
                return parseColour(text, entry.value);
        }
    }

    // What a colour picked in the colour box gives: the colour, or a solid fill of it for a Fill.
    static colourValue(entry: TriggerTypedEntry & { kind: 'colour' }, colour: string): JsonValue {
        if (entry.isFill === true) return { kind: 'solid', colour };

        return colour;
    }

    // The vector field's two boxes: an empty box keeps its axis as it was, or 0 while the vector is unset.
    static parseAxes(entry: TriggerTypedEntry & { kind: 'vector' }, xText: string, yText: string): TriggerTypingResult {
        const x = parseAxis(xText, entry.value?.x ?? 0, entry);
        if (x.kind === 'invalid') return { kind: 'invalid', reason: `x: ${x.reason}` };

        const y = parseAxis(yText, entry.value?.y ?? 0, entry);
        if (y.kind === 'invalid') return { kind: 'invalid', reason: `y: ${y.reason}` };

        return { kind: 'value', value: { x: x.value, y: y.value } };
    }
}

type AxisResult =
    { readonly kind: 'value'; readonly value: number } | { readonly kind: 'invalid'; readonly reason: string };

// A number box's unit and, for a length or a speed in metres, its scale.
type ShownBox = { readonly unit?: Unit; readonly displayScale?: number; readonly precision?: number };

function parseAxis(text: string, oldValue: number, box: ShownBox): AxisResult {
    const result = ValueInput.parseNumber(text, { ...box, label: 'The number', type: ANY_NUMBER });
    if (result.kind === 'restore') return { kind: 'value', value: oldValue };

    return result;
}

function parseColour(text: string, oldValue: string | null): TriggerTypingResult {
    if (text.trim() === '') return { kind: 'restore' };

    const oldColour = oldValue ?? undefined;
    return ValueInput.parseColour(text, oldColour);
}

function parseText(text: string): TriggerTypingResult {
    if (text.length > MAX_STRING_VARIABLE_LENGTH) return { kind: 'invalid', reason: 'At most 1,000 characters' };

    return { kind: 'value', value: text };
}

function parseWord(text: string): TriggerTypingResult {
    if (text.trim() === '') return { kind: 'restore' };

    const name = wordName(text);
    if (name === '') return { kind: 'invalid', reason: 'Type a word, such as open' };
    if (isReservedEventName(name)) return { kind: 'invalid', reason: `${name} is the name of an event` };

    return { kind: 'value', value: name };
}

function parseNumber(text: string, box: ShownBox): TriggerTypingResult {
    const result = ValueInput.parseNumber(text, { ...box, label: 'The number', type: ANY_NUMBER });
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

    const x = parseNumber(match[1] as string, {});
    const y = parseNumber(match[2] as string, {});
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
