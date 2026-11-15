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

    test("a polygon's Width and Height are its points' extent, and typing them rescales the points", () => {
        const shape = new ShapeComponent({ geometry: { kind: 'polygon', points: triangle } });

        expect(shape.readDerived('width')).toBe(100);
        expect(shape.readDerived('height')).toBe(80);

        shape.writeDerived('width', 200);
        shape.writeDerived('height', 40);

        expect(shape.get('geometry')).toEqual({
            kind: 'polygon',
            points: [
                { x: -100, y: -20 },
                { x: 100, y: -20 },
                { x: 0, y: 20 },
            ],
        });
    });

    test('typing a size for a rectangle changes it, at least 1 px', () => {
        const shape = new ShapeComponent();

        shape.writeDerived('width', 250);
        shape.writeDerived('height', 0.25);

        expect(shape.get('geometry')).toEqual({ kind: 'rectangle', width: 250, height: 1 });
    });

    test('a flat line shows Height 0, and typing a height for it is refused', () => {
        const floor = [
            { x: -150, y: 0 },
            { x: 150, y: 0 },
        ];
        const shape = new ShapeComponent({ geometry: { kind: 'line', points: floor } });

        const outcome = shape.writeDerived('height', 20);

        expect(shape.readDerived('height')).toBe(0);
        expect(outcome).toEqual({ ok: false, problem: { reason: 'flatShape' } });
        expect(shape.get('geometry')).toEqual({ kind: 'line', points: floor });
    });

    test('Points counts the points, and applies only to a polygon or line', () => {
        const pointsField = ShapeComponent.schema.findDerivedField('points');
        const polygon = new ShapeComponent({ geometry: { kind: 'polygon', points: triangle } });
        const square = new ShapeComponent();

        expect(polygon.readDerived('points')).toBe(3);
        expect(pointsField?.appliesWhen?.({ geometry: { kind: 'polygon', points: triangle } })).toBe(true);
        expect(pointsField?.appliesWhen?.(square.schema.defaults())).toBe(false);
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

    test('Kind and Points are read-only', () => {
        const shape = new ShapeComponent();

        expect(() => shape.writeDerived('kind', 'circle')).toThrow();
        expect(() => shape.writeDerived('points', 4)).toThrow();
    });
});
