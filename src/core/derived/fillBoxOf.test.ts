import { describe, expect, test } from 'vitest';

import { PathComponent, ShapeComponent, StyleComponent } from '../components/index.ts';
import { Level } from '../level/index.ts';
import { Bounds } from '../geometry/index.ts';
import type { ShapeGeometry } from '../geometry/index.ts';

import { fillBoxOf } from './fillBoxOf.ts';

function shapeEntity(geometry: ShapeGeometry) {
    const level = Level.createNew();
    const entity = level.createEntity(level.world, 0);
    entity.addComponent(new ShapeComponent({ geometry }));

    return entity;
}

describe('fillBoxOf', () => {
    test("a rectangle's box is its sides and a circle's its square, both centred", () => {
        expect(fillBoxOf(shapeEntity({ kind: 'rectangle', width: 40, height: 20 }))).toEqual(
            new Bounds(-20, -10, 20, 10),
        );
        expect(fillBoxOf(shapeEntity({ kind: 'circle', radius: 5 }))).toEqual(new Bounds(-5, -5, 5, 5));
    });

    test("a polygon's box is its points' box", () => {
        const points = [
            { x: 0, y: 0 },
            { x: 30, y: 10 },
            { x: -5, y: 40 },
        ];

        expect(fillBoxOf(shapeEntity({ kind: 'polygon', points }))).toEqual(new Bounds(-5, 0, 30, 40));
    });

    test('the outline width never changes the box', () => {
        const entity = shapeEntity({ kind: 'rectangle', width: 40, height: 20 });
        const style = new StyleComponent();
        entity.addComponent(style);
        style.set('outlineWidth', 12);

        expect(fillBoxOf(entity)).toEqual(new Bounds(-20, -10, 20, 10));
    });

    test("a path's box is its curve's", () => {
        const level = Level.createNew();
        const entity = level.createEntity(level.world, 0);
        const sharp = { handleIn: null, handleOut: null, corner: 'sharp' } as const;
        const path = {
            closed: true,
            points: [
                { x: 0, y: 0, ...sharp },
                { x: 10, y: 0, ...sharp },
                { x: 5, y: 8, ...sharp },
            ],
        };
        entity.addComponent(new PathComponent({ path }));

        expect(fillBoxOf(entity)).toEqual(new Bounds(0, 0, 10, 8));
    });

    test('an entity with no shape or path has no box', () => {
        const level = Level.createNew();

        expect(fillBoxOf(level.createEntity(level.world, 0))).toBeUndefined();
    });
});
