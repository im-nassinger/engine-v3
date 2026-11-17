import { describe, expect, it } from 'vitest';

import { sizingModifiers } from './sizingModifiers.ts';

const NONE = { shift: false, alt: false, ctrl: false };

describe('sizingModifiers', () => {
    it('reads Ctrl+Shift as from the centre only, snapping on and proportions free', () => {
        expect(sizingModifiers({ shift: true, alt: false, ctrl: true })).toEqual({
            shift: false,
            alt: true,
            ctrl: false,
        });
    });

    it('reads Ctrl+Shift+Alt as from the centre only', () => {
        expect(sizingModifiers({ shift: true, alt: true, ctrl: true })).toEqual({
            shift: false,
            alt: true,
            ctrl: false,
        });
    });

    it('leaves every other set of keys as it is', () => {
        const others = [
            NONE,
            { ...NONE, shift: true },
            { ...NONE, alt: true },
            { ...NONE, ctrl: true },
            { ...NONE, alt: true, shift: true },
            { ...NONE, alt: true, ctrl: true },
        ];
        for (const modifiers of others) {
            expect(sizingModifiers(modifiers)).toEqual(modifiers);
        }
    });
});
