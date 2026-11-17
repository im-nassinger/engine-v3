import { describe, expect, test } from 'vitest';

import { ShapeComponent } from './ShapeComponent.ts';

const triangle = [
    { x: -50, y: -40 },
    { x: 50, y: -40 },
    { x: 0, y: 40 },
];

describe('ShapeComponent', () => {
    test('a new one is a 100 px square', () => {
        const shape = new ShapeComponent();

        expect(shape.get('geometry')).toEqual({ kind: 'rectangle', width: 100, height: 100 });
        expect(shape.readDerived('kind')).toBe('rectangle');
        expect(shape.readDerived('width')).toBe(100);
    });

    test('a polygon or line has no Width or Height, only its points', () => {
        const widthField = ShapeComponent.schema.findDerivedField('width');
        const heightField = ShapeComponent.schema.findDerivedField('height');
        const polygon = new ShapeComponent({ geometry: { kind: 'polygon', points: triangle } });
        const line = new ShapeComponent({ geometry: { kind: 'line', points: triangle.slice(0, 2) } });

        for (const shape of [polygon, line]) {
            const values = { geometry: shape.get('geometry') };
            expect(widthField?.appliesWhen?.(values)).toBe(false);
            expect(heightField?.appliesWhen?.(values)).toBe(false);
            expect(() => shape.writeDerived('width', 200)).toThrow();
            expect(() => shape.writeDerived('height', 40)).toThrow();
        }
        expect(polygon.get('geometry')).toEqual({ kind: 'polygon', points: triangle });
    });

    test('typing a size for a rectangle changes it, at least 1 px', () => {
        const shape = new ShapeComponent();

        shape.writeDerived('width', 250);
        shape.writeDerived('height', 0.25);

        expect(shape.get('geometry')).toEqual({ kind: 'rectangle', width: 250, height: 1 });
    });

    test('Points lists the points, and applies only to a polygon or line', () => {
        const pointsField = ShapeComponent.schema.findDerivedField('points');
        const polygon = new ShapeComponent({ geometry: { kind: 'polygon', points: triangle } });
        const square = new ShapeComponent();

        expect(polygon.readDerived('points')).toEqual(triangle);
        expect(pointsField?.type.kind).toBe('list');
        expect(pointsField?.appliesWhen?.({ geometry: { kind: 'polygon', points: triangle } })).toBe(true);
        expect(pointsField?.appliesWhen?.(square.schema.defaults())).toBe(false);
    });

    test("writing Points on a polygon replaces its points, and the read list isn't the stored one", () => {
        const polygon = new ShapeComponent({ geometry: { kind: 'polygon', points: triangle } });
        const square = [
            { x: -10, y: -10 },
            { x: 10, y: -10 },
            { x: 10, y: 10 },
            { x: -10, y: 10 },
        ];

        const outcome = polygon.writeDerived('points', square);
        const readPoints = polygon.readDerived('points') as { x: number; y: number }[];
        for (const point of readPoints) {
            point.x = 99;
        }

        expect(outcome).toEqual({ ok: true, value: square });
        expect(polygon.get('geometry')).toEqual({ kind: 'polygon', points: square });
    });

    test('a polygon keeps at least 3 points and a line 2, and neither more than 1,000', () => {
        const polygon = new ShapeComponent({ geometry: { kind: 'polygon', points: triangle } });
        const line = new ShapeComponent({ geometry: { kind: 'line', points: triangle.slice(0, 2) } });
        const twoPoints = triangle.slice(0, 2);
        const tooMany = Array.from({ length: 1_001 }, (_, index) => ({ x: index, y: 0 }));

        expect(polygon.writeDerived('points', twoPoints)).toEqual({
            ok: false,
            problem: { reason: 'tooFewItems', minCount: 3 },
        });
        expect(line.writeDerived('points', triangle.slice(0, 1))).toEqual({
            ok: false,
            problem: { reason: 'tooFewItems', minCount: 2 },
        });
        expect(line.writeDerived('points', tooMany)).toEqual({
            ok: false,
            problem: { reason: 'tooManyItems', maxCount: 1_000 },
        });
        expect(polygon.get('geometry')).toEqual({ kind: 'polygon', points: triangle });
        expect(line.writeDerived('points', twoPoints)).toEqual({ ok: true, value: twoPoints });
    });

    test('a rectangle has no Points to write', () => {
        const square = new ShapeComponent();

        expect(() => square.writeDerived('points', triangle)).toThrow();
    });

    test('a circle shows only Radius, and typing it keeps the circle at least 1 px across', () => {
        const circle = new ShapeComponent({ geometry: { kind: 'circle', radius: 30 } });
        const circleValues = circle.schema.defaults();
        const roundValues = { ...circleValues, geometry: { kind: 'circle', radius: 30 } } as const;
        const radiusField = ShapeComponent.schema.findDerivedField('radius');
        const widthField = ShapeComponent.schema.findDerivedField('width');
        const heightField = ShapeComponent.schema.findDerivedField('height');

        expect(circle.readDerived('kind')).toBe('circle');
        expect(circle.readDerived('radius')).toBe(30);
        expect(radiusField?.appliesWhen?.(roundValues)).toBe(true);
        expect(widthField?.appliesWhen?.(roundValues)).toBe(false);
        expect(heightField?.appliesWhen?.(roundValues)).toBe(false);
        expect(radiusField?.appliesWhen?.(circleValues)).toBe(false);

        circle.writeDerived('radius', 45);
        expect(circle.get('geometry')).toEqual({ kind: 'circle', radius: 45 });

        circle.writeDerived('radius', 0.1);
        expect(circle.get('geometry')).toEqual({ kind: 'circle', radius: 0.5 });
    });

    test('a rectangle has no Radius to write', () => {
        const square = new ShapeComponent();

        expect(() => square.writeDerived('radius', 10)).toThrow();
        expect(square.get('geometry')).toEqual({ kind: 'rectangle', width: 100, height: 100 });
    });

    test('writing Kind changes the geometry, and a line of 2 points is refused as a polygon', () => {
        const shape = new ShapeComponent();
        const line = new ShapeComponent({ geometry: { kind: 'line', points: triangle.slice(0, 2) } });

        shape.writeDerived('kind', 'circle');
        const outcome = line.writeDerived('kind', 'polygon');

        expect(shape.get('geometry')).toEqual({ kind: 'circle', radius: 50 });
        expect(outcome).toEqual({ ok: false, problem: { reason: 'tooFewPoints', minCount: 3 } });
        expect(line.readDerived('kind')).toBe('line');
    });
});
