import { describe, expect, test } from 'vitest';

import type { PathGeometry, PathPoint } from '../PathGeometry.ts';

import { oppositeHandle, smoothHandles } from './smoothHandles.ts';

function sharp(x: number, y: number): PathPoint {
    return { x, y, handleIn: null, handleOut: null, corner: 'sharp' };
}

function path(closed: boolean, ...points: PathPoint[]): PathGeometry {
    return { closed, points };
}

describe('smoothHandles', () => {
    test('a middle point takes handles along the line from the point before to the point after', () => {
        const corner = path(false, sharp(0, 0), sharp(30, 0), sharp(30, 60));

        const handles = smoothHandles(corner, 1);

        // The line from (0, 0) to (30, 60) has the direction (1, 2) / √5.
        const unit = { x: 1 / Math.sqrt(5), y: 2 / Math.sqrt(5) };
        expect(handles.handleIn?.x).toBeCloseTo(-unit.x * 10);
        expect(handles.handleIn?.y).toBeCloseTo(-unit.y * 10);
        expect(handles.handleOut?.x).toBeCloseTo(unit.x * 20);
        expect(handles.handleOut?.y).toBeCloseTo(unit.y * 20);
    });

    test('each handle is a third of the way to its own neighbour', () => {
        const straight = path(false, sharp(0, 0), sharp(30, 0), sharp(120, 0));

        expect(smoothHandles(straight, 1)).toEqual({ handleIn: { x: -10, y: 0 }, handleOut: { x: 30, y: 0 } });
    });

    test('an end of an open path takes one handle, towards its one neighbour', () => {
        const open = path(false, sharp(0, 0), sharp(30, 60), sharp(90, 60));

        expect(smoothHandles(open, 0)).toEqual({ handleIn: null, handleOut: { x: 10, y: 20 } });
        expect(smoothHandles(open, 2)).toEqual({ handleIn: { x: -20, y: 0 }, handleOut: null });
    });

    test('on a closed path the first and last points have both neighbours', () => {
        const triangle = path(true, sharp(0, 0), sharp(30, 0), sharp(0, 30));

        const first = smoothHandles(triangle, 0);
        const last = smoothHandles(triangle, 2);

        expect(first.handleIn).not.toBeNull();
        expect(first.handleOut).not.toBeNull();
        expect(last.handleIn).not.toBeNull();
        expect(last.handleOut).not.toBeNull();
        // From the last point (0, 30) to the second (30, 0): the line through the first point runs along (1, -1).
        expect(first.handleOut?.x).toBeCloseTo(10 / Math.sqrt(2));
        expect(first.handleOut?.y).toBeCloseTo(-10 / Math.sqrt(2));
    });

    test('when both neighbours lie on one spot, each handle points at its own neighbour', () => {
        const folded = path(true, sharp(0, 0), sharp(30, 0), sharp(30, 0));

        expect(smoothHandles(folded, 0)).toEqual({ handleIn: { x: 10, y: 0 }, handleOut: { x: 10, y: 0 } });
    });
});

describe('oppositeHandle', () => {
    test('turns the other handle opposite the moved one, keeping its own length', () => {
        const turned = oppositeHandle({ x: 0, y: 10 }, { x: 5, y: 0 });

        expect(turned.x).toBeCloseTo(0);
        expect(turned.y).toBeCloseTo(-5);
    });

    test('a handle of length 0 leaves the other as it was', () => {
        expect(oppositeHandle({ x: 0, y: 0 }, { x: 5, y: 1 })).toEqual({ x: 5, y: 1 });
    });
});
