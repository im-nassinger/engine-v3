import { describe, expect, test } from 'vitest';

import { Matrix2D } from '../../../../core/geometry/index.ts';
import type { Point } from '../../../../core/geometry/index.ts';

import type { ShownGradient } from './GradientSource.ts';
import { EDGE_STEPS, planGradientHandles } from './planGradientHandles.ts';

// Twice the level, moved 10 px right.
const VIEW = { levelToScreen: (point: Point) => ({ x: point.x * 2 + 10, y: point.y * 2 }) };

const LINEAR: ShownGradient = {
    from: { position: { x: 0, y: 0 }, colour: '#FF0000FF' },
    to: { position: { x: 100, y: 0 }, colour: '#0000FFFF' },
    stops: [{ position: { x: 25, y: 0 }, colour: '#00FF0080' }],
    edge: undefined,
};

describe('planGradientHandles', () => {
    test('puts the line, the two dots and the stops between them on screen', () => {
        const plan = planGradientHandles(LINEAR, VIEW);

        expect(plan.line).toEqual([
            { x: 10, y: 0 },
            { x: 210, y: 0 },
        ]);
        expect(plan.ends).toEqual([
            { centre: { x: 10, y: 0 }, colour: '#FF0000FF' },
            { centre: { x: 210, y: 0 }, colour: '#0000FFFF' },
        ]);
        expect(plan.stops).toEqual([{ centre: { x: 60, y: 0 }, colour: '#00FF0080' }]);
        expect(plan.edge).toBeUndefined();
    });

    test("draws a radial gradient's edge as an ellipse when the box isn't square, turned with the entity", () => {
        const toLevel = Matrix2D.fromTransform({
            position: { x: 0, y: 0 },
            rotation: 90,
            scale: { x: 1, y: 1 },
            skew: 0,
        });
        const radial: ShownGradient = {
            ...LINEAR,
            edge: { centre: { x: 0, y: 0 }, radiusX: 40, radiusY: 10, toLevel },
        };

        const edge = planGradientHandles(radial, VIEW).edge ?? [];

        expect(edge).toHaveLength(EDGE_STEPS);
        // The own x axis points down the screen once turned 90° clockwise.
        const first = edge[0];
        const quarter = edge[EDGE_STEPS / 4];
        expect(first?.x).toBeCloseTo(10, 6);
        expect(first?.y).toBeCloseTo(80, 6);
        expect(quarter?.x).toBeCloseTo(-10, 6);
        expect(quarter?.y).toBeCloseTo(0, 6);
    });
});
