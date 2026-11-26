import { describe, expect, test } from 'vitest';

import { LengthDisplay } from '../../units/index.ts';
import { angleReadout, diameterReadout, moveReadout, sizeReadout } from './readoutText.ts';

const METRES = new LengthDisplay('metres', 100);
const PIXELS = new LengthDisplay('pixels', 100);

describe("the readouts' texts", () => {
    test('moving shows the distance with a minus sign', () => {
        expect(moveReadout({ x: 120, y: -40 }, METRES)).toBe('1.2, −0.4 m');
        expect(moveReadout({ x: 120, y: -40 }, PIXELS)).toBe('120, −40 px');
    });

    test('resizing shows the new size', () => {
        expect(sizeReadout({ x: 200, y: 100 }, METRES)).toBe('2 × 1 m');
        expect(sizeReadout({ x: 200, y: 100 }, PIXELS)).toBe('200 × 100 px');
    });

    test('a circle shows how wide it is across', () => {
        expect(diameterReadout(100, METRES)).toBe('⌀ 1 m');
        expect(diameterReadout(100, PIXELS)).toBe('⌀ 100 px');
    });

    test('rotating shows the angle', () => {
        expect(angleReadout(45)).toBe('45°');
        expect(angleReadout(-22.5)).toBe('−22.5°');
    });

    test('metres to the pixel, pixels to one decimal, and never −0', () => {
        expect(moveReadout({ x: 12.345, y: -0.04 }, METRES)).toBe('0.12, 0 m');
        expect(moveReadout({ x: 12.345, y: -0.04 }, PIXELS)).toBe('12.3, 0 px');
        expect(angleReadout(-0)).toBe('0°');
    });
});
