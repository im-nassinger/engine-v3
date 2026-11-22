import { describe, expect, test } from 'vitest';

import { gridLookFor } from './gridLook.ts';

describe('gridLookFor', () => {
    test('a light background gets dark blue lines', () => {
        const look = gridLookFor({ kind: 'solid', colour: '#BFE3F5FF' });

        expect(look.colour).toBe(0x1e3c5f);
        expect(look.alpha).toEqual({ step: 0.13, origin: 0.32 });
    });

    test('a dark background gets fainter white lines', () => {
        const look = gridLookFor({ kind: 'solid', colour: '#1A2140FF' });

        expect(look.colour).toBe(0xffffff);
        expect(look.alpha).toEqual({ step: 0.05, origin: 0.14 });
    });

    test('no fill shows the dark app, so the lines are white', () => {
        expect(gridLookFor({ kind: 'none' }).colour).toBe(0xffffff);
        expect(gridLookFor(undefined).colour).toBe(0xffffff);
    });
});
