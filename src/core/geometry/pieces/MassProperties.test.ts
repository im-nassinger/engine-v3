import { describe, expect, test } from 'vitest';

import { MassProperties } from './MassProperties.ts';
import { Matrix2D } from '../Matrix2D.ts';
import { ShapePieces } from './ShapePieces.ts';
import {
    createRandomNumbers,
    FIGURE_OF_EIGHT,
    ONE_STROKE_STAR,
    randomPolygon,
    totalArea,
} from '../testing/testPolygons.ts';

// The default scale: 1 m is 100 px.
const AT_100 = 100;
const SQUARE_100 = ShapePieces.build({ kind: 'rectangle', width: 100, height: 100 }).pieces;

describe('MassProperties.of', () => {
    test('gives a 100 px square at density 1 a mass of 1 kg, centred on its middle', () => {
        const mass = MassProperties.of(SQUARE_100, 1, AT_100);

        expect(mass.area).toBe(10000);
        expect(mass.mass).toBe(1);
        expect(mass.centreOfMass).toEqual({ x: 0, y: 0 });
    });

    test('weighs the same square 4 kg at 50 px per metre, where it is 2 m × 2 m', () => {
        const mass = MassProperties.of(SQUARE_100, 1, 50);

        expect(mass.area).toBe(10000);
        expect(mass.mass).toBe(4);
    });

    test('multiplies the mass by the density', () => {
        expect(MassProperties.of(SQUARE_100, 2.5, AT_100).mass).toBe(2.5);
    });

    test('centres a circle on its middle, with area π r²', () => {
        const pieces = ShapePieces.build({ kind: 'circle', radius: 50 }).pieces;
        const mass = MassProperties.of(pieces, 1, AT_100);

        expect(mass.area).toBeCloseTo(Math.PI * 2500, 9);
        expect(mass.mass).toBeCloseTo(Math.PI / 4, 12);
        expect(mass.centreOfMass).toEqual({ x: 0, y: 0 });
    });

    test('centres a triangle on the average of its corners', () => {
        const triangle = [
            { x: 0, y: 0 },
            { x: 90, y: 0 },
            { x: 0, y: 60 },
        ];
        const mass = MassProperties.of([{ kind: 'polygon', points: triangle }], 1, AT_100);

        expect(mass.area).toBe(2700);
        expect(mass.centreOfMass?.x).toBeCloseTo(30, 12);
        expect(mass.centreOfMass?.y).toBeCloseTo(20, 12);
    });

    test('keeps its precision far from the origin', () => {
        const far = [
            { x: 1e7, y: 1e7 },
            { x: 1e7 + 3, y: 1e7 },
            { x: 1e7, y: 1e7 + 3 },
        ];
        const mass = MassProperties.of([{ kind: 'polygon', points: far }], 1, AT_100);

        expect(mass.area).toBe(4.5);
        expect(mass.centreOfMass).toEqual({ x: 1e7 + 1, y: 1e7 + 1 });
    });

    test('gives a line no area, no mass and no centre of mass', () => {
        const line = ShapePieces.build({
            kind: 'line',
            points: [
                { x: 0, y: 0 },
                { x: 100, y: 0 },
            ],
        }).pieces;
        const mass = MassProperties.of(line, 1, AT_100);

        expect(mass.area).toBe(0);
        expect(mass.mass).toBe(0);
        expect(mass.centreOfMass).toBeUndefined();
    });

    test('keeps the area at density 0 but has no mass and no centre', () => {
        const mass = MassProperties.of(SQUARE_100, 0, AT_100);

        expect(mass.area).toBe(10000);
        expect(mass.mass).toBe(0);
        expect(mass.centreOfMass).toBeUndefined();
    });

    test("adds up a figure-of-eight's and a star's pieces to their filled area", () => {
        for (const outline of [FIGURE_OF_EIGHT, ONE_STROKE_STAR]) {
            const result = ShapePieces.build({ kind: 'polygon', points: outline });
            const mass = MassProperties.of(result.pieces, 1, AT_100);

            expect(mass.area).toBeCloseTo(totalArea(result.filledOutlines), 6);
        }
    });

    test('centres a symmetric figure-of-eight between its two loops', () => {
        const result = ShapePieces.build({ kind: 'polygon', points: FIGURE_OF_EIGHT });
        const centre = MassProperties.of(result.pieces, 1, AT_100).centreOfMass;
        const outlineCentre = MassProperties.of(
            result.filledOutlines.map((points) => ({ kind: 'polygon' as const, points })),
            1,
            AT_100,
        ).centreOfMass;

        expect(centre?.x).toBeCloseTo(outlineCentre?.x ?? NaN, 9);
        expect(centre?.y).toBeCloseTo(outlineCentre?.y ?? NaN, 9);
    });

    test('gives the same bits twice for random polygons', () => {
        const random = createRandomNumbers(7);

        for (let i = 0; i < 100; i++) {
            const pieces = ShapePieces.build({ kind: 'polygon', points: randomPolygon(random) }).pieces;
            const first = MassProperties.of(pieces, 1.3, AT_100);
            const second = MassProperties.of(pieces, 1.3, AT_100);

            expect(second).toEqual(first);
        }
    });
});

describe('MassProperties.combine', () => {
    test('adds masses and weighs the centres by mass', () => {
        const light = MassProperties.of(SQUARE_100, 1, AT_100).transformedBy(moveTo(0, 0));
        const heavy = MassProperties.of(SQUARE_100, 3, AT_100).transformedBy(moveTo(200, 0));
        const both = MassProperties.combine([light, heavy]);

        expect(both.area).toBe(20000);
        expect(both.mass).toBe(4);
        expect(both.centreOfMass).toEqual({ x: 150, y: 0 });
    });

    test('ignores a part with no mass for the centre but counts its area', () => {
        const solid = MassProperties.of(SQUARE_100, 1, AT_100).transformedBy(moveTo(40, 60));
        const weightless = MassProperties.of(SQUARE_100, 0, AT_100);
        const both = MassProperties.combine([solid, weightless]);

        expect(both.area).toBe(20000);
        expect(both.mass).toBe(1);
        expect(both.centreOfMass).toEqual({ x: 40, y: 60 });
    });

    test('gives nothing no mass and no centre', () => {
        const none = MassProperties.combine([]);

        expect(none.mass).toBe(0);
        expect(none.centreOfMass).toBeUndefined();
    });
});

describe('MassProperties.transformedBy', () => {
    test('grows the mass with the scale, so a square scaled by 2 weighs four times as much', () => {
        const scaled = MassProperties.of(SQUARE_100, 1, AT_100).transformedBy(
            Matrix2D.fromTransform({ position: { x: 10, y: 20 }, rotation: 30, scale: { x: 2, y: 2 }, skew: 0 }),
        );

        expect(scaled.mass).toBeCloseTo(4, 12);
        expect(scaled.area).toBeCloseTo(40000, 9);
        expect(scaled.centreOfMass).toEqual({ x: 10, y: 20 });
    });

    test('matches moving the pieces themselves, for a mirrored, skewed matrix', () => {
        const triangle = [
            { x: 0, y: 0 },
            { x: 90, y: 0 },
            { x: 0, y: 60 },
        ];
        const matrix = Matrix2D.fromTransform({
            position: { x: 5, y: -7 },
            rotation: 40,
            scale: { x: 1.5, y: -0.5 },
            skew: 20,
        });
        const moved = triangle.map((point) => matrix.apply(point)).reverse();

        const expected = MassProperties.of([{ kind: 'polygon', points: moved }], 2, AT_100);
        const actual = MassProperties.of([{ kind: 'polygon', points: triangle }], 2, AT_100).transformedBy(matrix);

        expect(actual.area).toBeCloseTo(expected.area, 9);
        expect(actual.mass).toBeCloseTo(expected.mass, 12);
        expect(actual.centreOfMass?.x).toBeCloseTo(expected.centreOfMass?.x ?? NaN, 9);
        expect(actual.centreOfMass?.y).toBeCloseTo(expected.centreOfMass?.y ?? NaN, 9);
    });
});

function moveTo(x: number, y: number) {
    return Matrix2D.fromTransform({ position: { x, y }, rotation: 0, scale: { x: 1, y: 1 }, skew: 0 });
}
