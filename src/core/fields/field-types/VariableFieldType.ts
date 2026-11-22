import type { FieldType } from '../FieldType.ts';
import { wordName } from '../names/wordName.ts';
import type { ParseOutcome } from '../ParseOutcome.ts';
import { accept, hasExactlyKeys, isPlainObject, parseFiniteNumber, refuse } from '../rawChecks.ts';
import { TextFieldType } from './TextFieldType.ts';

// A variable's value: a number, a string or a boolean. Its type is the JSON type of the value, with no
// type field beside it, so a v3 variable reads as a number with nothing added.
export type VariableValue = number | string | boolean;

export type VariableType = 'number' | 'string' | 'boolean';

// A variable as its component lists it: a name and its starting value.
export type Variable = {
    readonly name: string;
    readonly value: VariableValue;
};

// The most characters a string variable holds; normalize cuts a longer one.
export const MAX_STRING_VARIABLE_LENGTH = 1000;

const STRING_VALUE = new TextFieldType({ maxLength: MAX_STRING_VARIABLE_LENGTH });

const STARTING_VALUES: Readonly<Record<VariableType, VariableValue>> = { number: 0, string: '', boolean: false };

export function variableTypeOf(value: VariableValue): VariableType {
    if (typeof value === 'string') return 'string';
    if (typeof value === 'boolean') return 'boolean';

    return 'number';
}

// The value a variable is put back to when its type changes: 0, "" or false.
export function startingValueOf(type: VariableType) {
    return STARTING_VALUES[type];
}

// One variable, such as `{ "name": "coins", "value": 0 }` or `{ "name": "door_open", "value": false }`. Its
// name follows the tag rule (wordName), so a script can use it in v5; the list it is in keeps the names
// unique (ListFieldType's itemName).
export class VariableFieldType implements FieldType<Variable> {
    readonly kind = 'variable';

    parse(raw: unknown): ParseOutcome<Variable> {
        if (!isPlainObject(raw)) return refuse({ reason: 'wrongType' });
        if (!hasExactlyKeys(raw, ['name', 'value'])) return refuse({ reason: 'wrongType' });

        const name = raw['name'];
        if (typeof name !== 'string') return refuse({ reason: 'wrongType' });
        if (wordName(name) === '') return refuse({ reason: 'noName' });

        const rawValue = raw['value'];
        if (typeof rawValue === 'string' || typeof rawValue === 'boolean') return accept({ name, value: rawValue });

        const value = parseFiniteNumber(rawValue);
        if (!value.ok) return value;

        return accept({ name, value: value.value });
    }

    serialize(value: Variable) {
        return { name: value.name, value: value.value };
    }

    normalize(value: Variable) {
        return { name: wordName(value.name), value: normalizedValue(value.value) };
    }

    clone(value: Variable) {
        return { name: value.name, value: value.value };
    }

    equals(first: Variable, second: Variable) {
        return first.name === second.name && first.value === second.value;
    }
}

function normalizedValue(value: VariableValue) {
    if (typeof value === 'string') return STRING_VALUE.normalize(value);

    return value;
}
