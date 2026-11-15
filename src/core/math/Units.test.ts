import { describe, expect, test } from 'vitest';

import { Units } from './Units.ts';

describe('Units', () => {
    test('has 50 pixels in a metre', () => {
        expect(Units.toMetres(50)).toBe(1);
        expect(Units.toMetres(100)).toBe(2);
        expect(Units.toPixels(1)).toBe(50);
        expect(Units.toPixels(-0.5)).toBe(-25);
    });

    test('turns degrees into radians and back', () => {
        expect(Units.toRadians(180)).toBe(Math.PI);
        expect(Units.toRadians(-90)).toBeCloseTo(-Math.PI / 2, 15);
        expect(Units.toDegrees(Math.PI)).toBe(180);
        expect(Units.toDegrees(Math.PI / 2)).toBeCloseTo(90, 12);
    });

    test.each([0, 1, -37.5, 123.456, 1e6])('converts %d both ways and comes back', (value) => {
        const metresAndBack = Units.toPixels(Units.toMetres(value));
        const radiansAndBack = Units.toDegrees(Units.toRadians(value));

        expect(metresAndBack).toBeCloseTo(value, 9);
        expect(radiansAndBack).toBeCloseTo(value, 9);
    });
});
