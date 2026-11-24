import type { WhenKind } from '../../fields/index.ts';

// The builtin events' names, in snake_case as a custom event's name is written: a custom event can't take
// one, so a script (v5) never confuses its own event with a builtin one. Keyed by When kind, so a new kind
// can't be left out.
const RESERVED_BY_KIND: Readonly<Record<WhenKind, string>> = {
    touched: 'touched',
    untouched: 'untouched',
    input: 'input',
    key: 'key',
    after: 'after',
    every: 'every',
    levelStart: 'level_start',
    custom: 'custom',
    variableChanged: 'variable_changed',
};

const RESERVED_NAMES: ReadonlySet<string> = new Set(Object.values(RESERVED_BY_KIND));

export function isReservedEventName(name: string) {
    return RESERVED_NAMES.has(name);
}
