import { describe, expect, test } from 'vitest';
import { Matrix2D } from '../../../../core/geometry/index.ts';
import type { PathGeometry, PathPoint } from '../../../../core/geometry/index.ts';

import { pathOutline } from './shapeOutline.ts';

function sharp(x: number, y: number): PathPoint {
    return { x, y, handleIn: null, handleOut: null, corner: 'sharp' };
}

const AT_100_0 = new Matrix2D(1, 0, 0, 1, 100, 0);

describe('pathOutline', () => {
    test('a straight path keeps only its points, moved by the matrix', () => {
        const path: PathGeometry = { closed: false, points: [sharp(0, 0), sharp(10, 0), sharp(10, 10)] };
        const outline = pathOutline(path, AT_100_0, 1);

        expect(outline.points).toEqual([
            { x: 100, y: 0 },
            { x: 110, y: 0 },
            { x: 110, y: 10 },
        ]);
        expect(outline.isClosed).toBe(false);
    });

    test('a closed path does not repeat its first point', () => {
        const path: PathGeometry = { closed: true, points: [sharp(0, 0), sharp(10, 0), sharp(10, 10)] };
        const outline = pathOutline(path, AT_100_0, 1);

        expect(outline.points).toHaveLength(3);
        expect(outline.isClosed).toBe(true);
    });

    test('a curve is cut into more pieces when zoomed in, up to a limit', () => {
        const bent: PathGeometry = {
            closed: false,
            points: [
                { x: 0, y: 0, handleIn: null, handleOut: { x: 0, y: 50 }, corner: 'smooth' },
                { x: 100, y: 0, handleIn: { x: 0, y: 50 }, handleOut: null, corner: 'smooth' },
            ],
        };
        const zoomedOut = pathOutline(bent, AT_100_0, 0.01);
        const zoomedIn = pathOutline(bent, AT_100_0, 1);
        const veryClose = pathOutline(bent, AT_100_0, 100);

        expect(zoomedOut.points).toHaveLength(2);
        expect(zoomedIn.points.length).toBeGreaterThan(10);
        expect(veryClose.points).toHaveLength(33);
        expect(zoomedIn.points.at(-1)).toEqual({ x: 200, y: 0 });
    });
});
