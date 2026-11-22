import { describe, expect, test } from 'vitest';

import { MAX_WORD_NAME_LENGTH, wordName } from './wordName.ts';

describe('wordName', () => {
    test('makes what is typed lowercase, with its spaces as `_`', () => {
        expect(wordName('Coin')).toBe('coin');
        expect(wordName('  Flying   Boss ')).toBe('flying_boss');
    });

    test('keeps letters, digits and `_`, and drops every other character', () => {
        expect(wordName('enemy_2')).toBe('enemy_2');
        expect(wordName('hé-llo!#')).toBe('hllo');
    });

    test('cuts at 32 characters', () => {
        const long = 'a'.repeat(40);

        expect(wordName(long)).toBe('a'.repeat(MAX_WORD_NAME_LENGTH));
        expect(MAX_WORD_NAME_LENGTH).toBe(32);
    });

    test('is empty when nothing is left', () => {
        expect(wordName('   ')).toBe('');
        expect(wordName('!?')).toBe('');
    });
});
