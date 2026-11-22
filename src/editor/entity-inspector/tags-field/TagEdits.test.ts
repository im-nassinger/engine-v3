import { describe, expect, test } from 'vitest';

import { TagEdits } from './TagEdits.ts';

describe('TagEdits', () => {
    test('a typed tag is made lowercase, with its spaces as `_`, and nothing is left of only spaces', () => {
        expect(TagEdits.typedTag(' Big Coin ')).toBe('big_coin');
        expect(TagEdits.typedTag('   ')).toBeUndefined();
        expect(TagEdits.typedTag('#!')).toBeUndefined();
    });

    test('withTag adds the tag at the end, once', () => {
        expect(TagEdits.withTag(['coin'], 'pickup')).toEqual(['coin', 'pickup']);
        expect(TagEdits.withTag(['coin'], 'coin')).toEqual(['coin']);
    });

    test('withoutTag removes the tag and keeps the order of the others', () => {
        expect(TagEdits.withoutTag(['coin', 'pickup', 'big'], 'pickup')).toEqual(['coin', 'big']);
    });
});
