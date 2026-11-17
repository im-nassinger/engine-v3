import { describe, expect, test } from 'vitest';
import { Matrix2D } from '../../../../core/geometry/index.ts';
import type { Point } from '../../../../core/geometry/index.ts';

import { planDrawing } from './drawingPlan.ts';
import type { ShownPolygonPreview } from './DrawingSource.ts';

const IDENTITY = Matrix2D.identity();

function polygon(points: readonly Point[], next: Point | undefined, closing = false): ShownPolygonPreview {
    return { points, next, closing, toLevel: IDENTITY };
}

describe('planDrawing', () => {
    test('nothing to draw without a preview', () => {
        const plan = planDrawing(undefined, undefined);

        expect(plan.fill).toBeUndefined();
        expect(plan.solid).toBeUndefined();
        expect(plan.dashed).toEqual([]);
        expect(plan.handles).toEqual([]);
        expect(plan.ring).toBeUndefined();
    });

    test('a rectangle is filled and outlined solid around its position', () => {
        const drawing = {
            geometry: { kind: 'rectangle' as const, width: 20, height: 10 },
            position: { x: 100, y: 50 },
            rotation: 0,
        };
        const plan = planDrawing({ drawing, toLevel: IDENTITY }, undefined);

        expect(plan.solid?.isClosed).toBe(true);
        expect(plan.solid?.points).toEqual([
            { x: 90, y: 45 },
            { x: 110, y: 45 },
            { x: 110, y: 55 },
            { x: 90, y: 55 },
        ]);
        expect(plan.fill).toEqual(plan.solid?.points);
        expect(plan.dashed).toEqual([]);
        expect(plan.handles).toEqual([]);
    });

    test('a circle goes through the group space’s matrix to level positions', () => {
        const drawing = { geometry: { kind: 'circle' as const, radius: 10 }, position: { x: 0, y: 0 }, rotation: 0 };
        const toLevel = new Matrix2D(2, 0, 0, 2, 300, 0);
        const plan = planDrawing({ drawing, toLevel }, undefined);

        const xs = plan.solid?.points.map((point) => point.x) ?? [];
        expect(Math.min(...xs)).toBeCloseTo(280);
        expect(Math.max(...xs)).toBeCloseTo(320);
    });

    test('a turned rectangle is outlined at its rotation around its position', () => {
        const drawing = {
            geometry: { kind: 'rectangle' as const, width: 20, height: 10 },
            position: { x: 100, y: 50 },
            rotation: 90,
        };
        const plan = planDrawing({ drawing, toLevel: IDENTITY }, undefined);

        const points = plan.solid?.points ?? [];
        const xs = points.map((point) => point.x);
        const ys = points.map((point) => point.y);
        expect(Math.min(...xs)).toBeCloseTo(95);
        expect(Math.max(...xs)).toBeCloseTo(105);
        expect(Math.min(...ys)).toBeCloseTo(40);
        expect(Math.max(...ys)).toBeCloseTo(60);
    });

    test('before the first click only the next point shows, as a handle', () => {
        const plan = planDrawing(undefined, polygon([], { x: 5, y: 5 }));

        expect(plan.handles).toEqual([{ x: 5, y: 5 }]);
        expect(plan.ring).toBeUndefined();
        expect(plan.dashed).toEqual([]);
    });

    test('one point: the ring and a dashed segment to the mouse, nothing filled', () => {
        const plan = planDrawing(undefined, polygon([{ x: 0, y: 0 }], { x: 10, y: 0 }));

        expect(plan.ring).toEqual({ x: 0, y: 0 });
        expect(plan.handles).toEqual([]);
        expect(plan.solid).toBeUndefined();
        expect(plan.dashed).toEqual([
            [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
            ],
        ]);
        expect(plan.fill).toBeUndefined();
    });

    test('two points: the placed segment solid, to the mouse and back to the first point dashed, filled', () => {
        const placed = [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
        ];
        const plan = planDrawing(undefined, polygon(placed, { x: 10, y: 10 }));

        expect(plan.solid).toEqual({ points: placed, isClosed: false });
        expect(plan.dashed).toEqual([
            [
                { x: 10, y: 0 },
                { x: 10, y: 10 },
            ],
            [
                { x: 10, y: 10 },
                { x: 0, y: 0 },
            ],
        ]);
        expect(plan.fill).toEqual([...placed, { x: 10, y: 10 }]);
        expect(plan.handles).toEqual([{ x: 10, y: 0 }]);
        expect(plan.closing).toBe(false);
    });

    test('closing: one dashed segment back to the first point, and the ring marked', () => {
        const placed = [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
        ];
        const plan = planDrawing(undefined, polygon(placed, { x: 0, y: 0 }, true));

        expect(plan.closing).toBe(true);
        expect(plan.dashed).toEqual([
            [
                { x: 10, y: 10 },
                { x: 0, y: 0 },
            ],
        ]);
        expect(plan.fill).toEqual(placed);
        expect(plan.handles).toEqual([
            { x: 10, y: 0 },
            { x: 10, y: 10 },
        ]);
    });

    test('the points go through the group space’s matrix', () => {
        const toLevel = new Matrix2D(1, 0, 0, 1, 100, 200);
        const plan = planDrawing(undefined, { points: [{ x: 1, y: 2 }], next: undefined, closing: false, toLevel });

        expect(plan.ring).toEqual({ x: 101, y: 202 });
        expect(plan.dashed).toEqual([]);
    });
});
