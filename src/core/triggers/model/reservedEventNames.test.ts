import { describe, expect, test } from 'vitest';

import { isReservedEventName } from './reservedEventNames.ts';

describe('isReservedEventName', () => {
    test.each(['touched', 'collision', 'level_start', 'tag_left', 'variable_changed', 'destroyed'])(
        'the builtin event %s is reserved',
        (name) => {
            expect(isReservedEventName(name)).toBe(true);
        },
    );

    test.each(['open', 'levelstart', 'hit'])('the name %s is free', (name) => {
        expect(isReservedEventName(name)).toBe(false);
    });
});
