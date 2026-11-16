import { describe, expect, test } from 'vitest';

import { angleReadout, diameterReadout, moveReadout, sizeReadout } from './readoutText.ts';

describe("the readouts' texts", () => {
    test('moving shows the distance with a minus sign', () => {
        expect(moveReadout({ x: 120, y: -40 })).toBe('120, −40 px');
    });

    test('resizing shows the new size', () => {
        expect(sizeReadout({ x: 200, y: 100 })).toBe('200 × 100 px');
    });

    test('a circle shows how wide it is across', () => {
        expect(diameterReadout(100)).toBe('⌀ 100 px');
    });

    test('rotating shows the angle', () => {
        expect(angleReadout(45)).toBe('45°');
        expect(angleReadout(-22.5)).toBe('−22.5°');
    });

    test('one decimal at most, and never −0', () => {
        expect(moveReadout({ x: 12.345, y: -0.04 })).toBe('12.3, 0 px');
        expect(angleReadout(-0)).toBe('0°');
    });
});
