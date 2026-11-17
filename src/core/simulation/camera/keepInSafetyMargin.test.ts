import { describe, expect, test } from 'vitest';

import { keepInSafetyMargin } from './keepInSafetyMargin.ts';

const box = { width: 1000, height: 500 };

describe('keepInSafetyMargin', () => {
    test('leaves the camera still while the target is inside the margin', () => {
        const position = keepInSafetyMargin({ x: 0, y: 0 }, box, { x: 399, y: -199 });

        expect(position).toEqual({ x: 0, y: 0 });
    });

    test('pulls the camera so the target is 10% of the box from its edge', () => {
        const position = keepInSafetyMargin({ x: 0, y: 0 }, box, { x: 450, y: -230 });

        expect(position.x).toBeCloseTo(50, 9);
        expect(position.y).toBeCloseTo(-30, 9);
    });

    test('cuts to the margin edge in one tick for a target thrown far away', () => {
        const position = keepInSafetyMargin({ x: 0, y: 0 }, box, { x: -50_000, y: 80_000 });

        expect(position.x).toBeCloseTo(-49_600, 9);
        expect(position.y).toBeCloseTo(79_800, 9);
    });
});
