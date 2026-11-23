// A variable's value: a number, a string or a boolean. Its type is the JSON type of the value, with no
// type field beside it, so a v3 variable reads as a number with nothing added. Kept apart from
// VariableFieldType so a trigger can compare values without depending on the field types.
export type VariableValue = number | string | boolean;

export type VariableType = 'number' | 'string' | 'boolean';

// The most characters a string variable holds; normalize cuts a longer one.
export const MAX_STRING_VARIABLE_LENGTH = 1000;

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
