import { describe, expect, test } from 'vitest';

import { PathPointFieldType } from '../../fields/index.ts';
import type { PathGeometry, PathPoint } from '../../geometry/index.ts';

import { PathComponent } from './PathComponent.ts';

const pointType = new PathPointFieldType();

function sharp(x: number, y: number): PathPoint {
    return { x, y, handleIn: null, handleOut: null, corner: 'sharp' };
}

function pathOf(closed: boolean, points: PathPoint[]) {
    return new PathComponent({ path: { closed, points } });
}

// Points is written as the Entity inspector writes it, in the stored shape.
function writePoints(component: PathComponent, points: readonly PathPoint[]) {
    const saved = points.map((point) => pointType.serialize(point));

    return component.writeDerived('points', saved);
}

function pointsOf(component: PathComponent): PathGeometry['points'] {
    return component.get('path').points;
}

describe('PathComponent', () => {
    test('a new one is a straight open path of two sharp points', () => {
        const path = new PathComponent();

        expect(path.get('path').closed).toBe(false);
        expect(path.readDerived('points')).toEqual([sharp(0, 0), sharp(100, 0)]);
    });

    test('it is never added by hand: the pen and the Pencil draw paths, and a joint makes its own', () => {
        expect(PathComponent.schema.addableByHand).toBe(false);
    });

    test('Points is a writable list of path points, read as copies', () => {
        const path = new PathComponent();
        const read = path.readDerived('points') as PathPoint[];

        const written = writePoints(path, [sharp(0, 0), sharp(50, 10), sharp(100, 0)]);

        expect(written.ok).toBe(true);
        expect(pointsOf(path)).toEqual([sharp(0, 0), sharp(50, 10), sharp(100, 0)]);
        expect(read).toHaveLength(2);
        expect(read[0]).not.toBe(pointsOf(path)[0]);
    });

    test('Points holds 2 to 2,000 points', () => {
        const path = new PathComponent();
        const tooMany = Array.from({ length: 2_001 }, (_item, index) => sharp(index, 0));
        const most = tooMany.slice(0, 2_000);

        expect(writePoints(path, [sharp(0, 0)])).toEqual({
            ok: false,
            problem: { reason: 'tooFewItems', minCount: 2 },
        });
        expect(writePoints(path, tooMany)).toEqual({
            ok: false,
            problem: { reason: 'tooManyItems', maxCount: 2_000 },
        });
        expect(writePoints(path, most).ok).toBe(true);
        expect(pointsOf(path)).toHaveLength(2_000);
    });

    test('a closed path keeps at least 3 points', () => {
        const triangle = pathOf(true, [sharp(0, 0), sharp(50, 0), sharp(0, 50)]);

        const written = writePoints(triangle, [sharp(0, 0), sharp(50, 0)]);

        expect(written).toEqual({ ok: false, problem: { reason: 'tooFewItems', minCount: 3 } });
        expect(pointsOf(triangle)).toHaveLength(3);
    });

    test('choosing Smooth on a sharp point gives it handles through smoothHandles', () => {
        const path = pathOf(false, [sharp(0, 0), sharp(30, 0), sharp(120, 0)]);

        writePoints(path, [sharp(0, 0), { ...sharp(30, 0), corner: 'smooth' }, sharp(120, 0)]);

        expect(pointsOf(path)[1]).toEqual({
            x: 30,
            y: 0,
            handleIn: { x: -10, y: 0 },
            handleOut: { x: 30, y: 0 },
            corner: 'smooth',
        });
    });

    test('an open path’s first point has no handle in and its last no handle out', () => {
        const path = pathOf(false, [sharp(0, 0), sharp(30, 60)]);
        const first = { x: 0, y: 0, handleIn: { x: -5, y: 0 }, handleOut: null, corner: 'separate' } as const;

        writePoints(path, [first, { ...sharp(30, 60), corner: 'smooth' }]);

        expect(pointsOf(path)[0]).toEqual({ ...first, handleIn: null, handleOut: { x: 10, y: 20 } });
        expect(pointsOf(path)[1]).toEqual({
            x: 30,
            y: 60,
            handleIn: { x: -10, y: -20 },
            handleOut: null,
            corner: 'smooth',
        });
    });

    test('choosing Sharp drops a point’s handles', () => {
        const curved = {
            x: 30,
            y: 0,
            handleIn: { x: -10, y: 0 },
            handleOut: { x: 10, y: 0 },
            corner: 'smooth',
        } as const;
        const path = pathOf(false, [sharp(0, 0), curved, sharp(90, 0)]);

        writePoints(path, [sharp(0, 0), { ...curved, corner: 'sharp' }, sharp(90, 0)]);

        expect(pointsOf(path)[1]).toEqual(sharp(30, 0));
    });

    test('typing one handle of a smooth point turns the other opposite it, keeping its length', () => {
        const curved = {
            x: 30,
            y: 0,
            handleIn: { x: -10, y: 0 },
            handleOut: { x: 20, y: 0 },
            corner: 'smooth',
        } as const;
        const path = pathOf(false, [sharp(0, 0), curved, sharp(90, 0)]);

        writePoints(path, [sharp(0, 0), { ...curved, handleIn: { x: 0, y: -10 } }, sharp(90, 0)]);

        const handleOut = pointsOf(path)[1]?.handleOut;
        expect(pointsOf(path)[1]?.handleIn).toEqual({ x: 0, y: -10 });
        expect(handleOut?.x).toBeCloseTo(0);
        expect(handleOut?.y).toBeCloseTo(20);
    });

    test('a separate point’s handles move on their own, and turning it smooth lines them up', () => {
        const loose = {
            x: 30,
            y: 0,
            handleIn: { x: -10, y: 0 },
            handleOut: { x: 0, y: 20 },
            corner: 'separate',
        } as const;
        const path = pathOf(false, [sharp(0, 0), loose, sharp(90, 0)]);

        writePoints(path, [sharp(0, 0), { ...loose, handleIn: { x: -10, y: -10 } }, sharp(90, 0)]);
        expect(pointsOf(path)[1]?.handleOut).toEqual({ x: 0, y: 20 });

        writePoints(path, [sharp(0, 0), { ...loose, corner: 'smooth' }, sharp(90, 0)]);
        const handleOut = pointsOf(path)[1]?.handleOut;
        expect(handleOut?.x).toBeCloseTo(20);
        expect(handleOut?.y).toBeCloseTo(0);
    });
});
