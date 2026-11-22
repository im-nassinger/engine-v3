import { describe, expect, test } from 'vitest';

import { playWarningText } from './playWarningText.ts';

describe('playWarningText', () => {
    test('names the unknown input', () => {
        const text = playWarningText({ kind: 'unknownInput', input: 'dash' });

        expect(text).toBe('A trigger listens for the input "dash", which the World doesn\'t have');
    });

    test('gives a text for each other warning', () => {
        expect(playWarningText({ kind: 'chainLimit' })).toContain('32');
        expect(playWarningText({ kind: 'valueFixedInPlay' })).toContain("can't change during play");
    });
});
