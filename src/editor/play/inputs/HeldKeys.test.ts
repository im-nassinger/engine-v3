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

    test('keeps the keys pressed since the last batch, even those already up, each once', () => {
        const keys = new HeldKeys();
        keys.press('KeyA');
        keys.release('KeyA');
        keys.press('Space');
        keys.press('Space');
        keys.press('KeyA');

        expect(keys.takePresses()).toEqual(['KeyA', 'Space']);
        expect(keys.takePresses()).toEqual([]);
    });

    test("a held key's repeat is no new press", () => {
        const keys = new HeldKeys();
        keys.press('Space');
        keys.takePresses();

        keys.press('Space');

        expect(keys.takePresses()).toEqual([]);
    });

    test('forgetPresses drops the presses and keeps the keys held; releaseAll drops both', () => {
        const keys = new HeldKeys();
        keys.press('KeyW');

        keys.forgetPresses();
        expect(keys.takePresses()).toEqual([]);
        expect(keys.codes()).toEqual(['KeyW']);

        keys.press('KeyD');
        keys.releaseAll();
        expect(keys.takePresses()).toEqual([]);
    });
});
