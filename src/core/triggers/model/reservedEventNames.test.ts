import { describe, expect, test } from 'vitest';

import { isReservedEventName } from './reservedEventNames.ts';

describe('isReservedEventName', () => {
    test.each(['touched', 'untouched', 'key', 'level_start', 'variable_changed', 'custom'])(
        'the builtin event %s is reserved',
        (name) => {
            expect(isReservedEventName(name)).toBe(true);
        },
    );

    test.each(['open', 'levelstart', 'hit', 'collision', 'destroyed'])('the name %s is free', (name) => {
        expect(isReservedEventName(name)).toBe(false);
    });
});
