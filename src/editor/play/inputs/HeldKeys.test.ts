import { describe, expect, test } from 'vitest';

import { HeldKeys } from './HeldKeys.ts';

describe('HeldKeys', () => {
    test('holds each key once, in the order it went down, until it goes up', () => {
        const keys = new HeldKeys();

        keys.press('KeyD');
        keys.press('Space');
        keys.press('KeyD');
        expect(keys.codes()).toEqual(['KeyD', 'Space']);

        keys.release('KeyD');
        expect(keys.codes()).toEqual(['Space']);
        expect(keys.isHeld('KeyD')).toBe(false);
        expect(keys.isHeld('Space')).toBe(true);
    });

    test('releaseAll lets go of every key', () => {
        const keys = new HeldKeys();
        keys.press('KeyA');
        keys.press('ShiftLeft');

        keys.releaseAll();

        expect(keys.codes()).toEqual([]);
    });

    test('the codes given out never change afterwards', () => {
        const keys = new HeldKeys();
        keys.press('KeyA');
        const sent = keys.codes();

        keys.release('KeyA');

        expect(sent).toEqual(['KeyA']);
    });
});
