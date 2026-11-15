import { describe, expect, test } from 'vitest';

import { Bounds } from '../Bounds.ts';
import { CIRCLE_POINT_COUNT, ShapeOutlines } from '../pieces/ShapeOutlines.ts';
import type { Point } from '../Point.ts';
import type { ShapeGeometry, ShapeKind } from '../ShapeGeometry.ts';

import { convertShape } from './convertShape.ts';

// Off the origin, so the offset shows: its bounds run from (10, 20) to (110, 80), centred on (60, 50).
const offCentreTriangle: Point[] = [
    { x: 10, y: 20 },
    { x: 110, y: 20 },
    { x: 60, y: 80 },
];
const rectangle: ShapeGeometry = { kind: 'rectangle', width: 120, height: 60 };
const circle: ShapeGeometry = { kind: 'circle', radius: 25 };
const polygon: ShapeGeometry = { kind: 'polygon', points: offCentreTriangle };
const line: ShapeGeometry = { kind: 'line', points: offCentreTriangle };

function converted(geometry: ShapeGeometry, kind: ShapeKind) {
    const outcome = convertShape(geometry, kind);
    if (!outcome.ok) throw new Error(`Refused ${geometry.kind} as ${kind}.`);

    return outcome.value;
}

function outlineOf(geometry: ShapeGeometry): readonly Point[] {
    if (geometry.kind === 'rectangle') return ShapeOutlines.rectangle(geometry.width, geometry.height);
    if (geometry.kind === 'circle') return ShapeOutlines.circle(geometry.radius);

    return geometry.points;
}

function centreOf(geometry: ShapeGeometry) {
    const outline = outlineOf(geometry);
    const bounds = Bounds.around(outline);
    if (bounds === undefined) throw new Error('No points.');

    return bounds.centre;
}

describe('convertShape', () => {
    test('a rectangle becomes its 4 corners as a polygon, and a line that ends at the first corner', () => {
        const corners = [
            { x: -60, y: -30 },
            { x: 60, y: -30 },
            { x: 60, y: 30 },
            { x: -60, y: 30 },
        ];

        expect(converted(rectangle, 'polygon')).toEqual({
            geometry: { kind: 'polygon', points: corners },
            offset: { x: 0, y: 0 },
        });
        expect(converted(rectangle, 'line').geometry).toEqual({
            kind: 'line',
            points: [...corners, { x: -60, y: -30 }],
        });
    });

    test('a circle becomes the 32 points it collides with, as a polygon or a line', () => {
        const outline = ShapeOutlines.circle(25);

        const asPolygon = converted(circle, 'polygon');
        const asLine = converted(circle, 'line');

        expect(asPolygon.geometry).toEqual({ kind: 'polygon', points: outline });
        expect(asLine.geometry).toEqual({ kind: 'line', points: outline });
        expect(outline).toHaveLength(CIRCLE_POINT_COUNT);
        expect(asPolygon.offset).toEqual({ x: 0, y: 0 });
    });

    test('a polygon or line becomes its bounds as a rectangle, moved to their centre', () => {
        const expected = {
            geometry: { kind: 'rectangle', width: 100, height: 60 },
            offset: { x: 60, y: 50 },
        };

        expect(converted(polygon, 'rectangle')).toEqual(expected);
        expect(converted(line, 'rectangle')).toEqual(expected);
    });

    test('a rectangle, polygon or line becomes the largest circle that fits its bounds', () => {
        expect(converted(rectangle, 'circle')).toEqual({
            geometry: { kind: 'circle', radius: 30 },
            offset: { x: 0, y: 0 },
        });
        expect(converted(polygon, 'circle')).toEqual({
            geometry: { kind: 'circle', radius: 30 },
            offset: { x: 60, y: 50 },
        });
        expect(converted(line, 'circle').geometry).toEqual({ kind: 'circle', radius: 30 });
    });

    test('a circle becomes a square as wide as the circle', () => {
        expect(converted(circle, 'rectangle')).toEqual({
            geometry: { kind: 'rectangle', width: 50, height: 50 },
            offset: { x: 0, y: 0 },
        });
    });

    test('a polygon becomes the same points open, and a line the same points closed', () => {
        expect(converted(polygon, 'line')).toEqual({ geometry: line, offset: { x: 0, y: 0 } });
        expect(converted(line, 'polygon')).toEqual({ geometry: polygon, offset: { x: 0, y: 0 } });
    });

    test('a line of 2 points is refused as a polygon, with the 3 it needs', () => {
        const twoPoints: ShapeGeometry = { kind: 'line', points: offCentreTriangle.slice(0, 2) };

        expect(convertShape(twoPoints, 'polygon')).toEqual({ ok: false, minPointCount: 3 });
    });

    test('the same kind gives the geometry back unchanged', () => {
        expect(converted(polygon, 'polygon')).toEqual({ geometry: polygon, offset: { x: 0, y: 0 } });
    });

    test('a flat line keeps the smallest sizes: a 1 px tall rectangle, a circle 1 px across', () => {
        const floor: ShapeGeometry = {
            kind: 'line',
            points: [
                { x: 0, y: 10 },
                { x: 300, y: 10 },
            ],
        };

        expect(converted(floor, 'rectangle')).toEqual({
            geometry: { kind: 'rectangle', width: 300, height: 1 },
            offset: { x: 150, y: 10 },
        });
        expect(converted(floor, 'circle').geometry).toEqual({ kind: 'circle', radius: 0.5 });
    });

    test("the new shape's bounds, moved by the offset, have the old one's centre, for every pair of kinds", () => {
        const shapes = [rectangle, circle, polygon, line];
        const kinds: ShapeKind[] = ['rectangle', 'circle', 'polygon', 'line'];

        for (const shape of shapes) {
            const oldCentre = centreOf(shape);

            for (const kind of kinds) {
                const conversion = converted(shape, kind);
                const newCentre = centreOf(conversion.geometry);
                const movedX = newCentre.x + conversion.offset.x;
                const movedY = newCentre.y + conversion.offset.y;

                expect(movedX).toBeCloseTo(oldCentre.x, 9);
                expect(movedY).toBeCloseTo(oldCentre.y, 9);
            }
        }
    });
});
