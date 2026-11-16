import { describe, expect, test } from 'vitest';

import { ShapeComponent, TransformComponent } from '../../../core/components/index.ts';
import type { Point, ShapeGeometry } from '../../../core/geometry/index.ts';
import { Level } from '../../../core/level/index.ts';

import { HighDetailRule } from './HighDetailRule.ts';

function pointsAround(count: number): Point[] {
    return Array.from({ length: count }, (_, index) => {
        const angle = (index / count) * Math.PI * 2;

        return { x: Math.cos(angle) * 100, y: Math.sin(angle) * 100 };
    });
}

function addShape(level: Level, geometry: ShapeGeometry) {
    const entity = level.createEntity(level.world, 0);
    entity.addComponent(new TransformComponent());
    entity.addComponent(new ShapeComponent({ geometry }));

    return entity;
}

function check(geometry: ShapeGeometry) {
    const level = Level.createNew();
    const entity = addShape(level, geometry);

    return new HighDetailRule().check(entity);
}

describe('HighDetailRule', () => {
    test('a polygon of 200 points has no tip, and one of 201 has it under its Points', () => {
        expect(check({ kind: 'polygon', points: pointsAround(200) })).toEqual([]);

        const [tip] = check({ kind: 'polygon', points: pointsAround(201) });
        expect(tip).toMatchObject({
            kind: 'tip',
            componentType: 'ShapeComponent',
            fieldKey: 'points',
            text: 'High detail may slow physics',
            fix: undefined,
        });
    });

    test('a line over 200 points gets the tip too', () => {
        expect(check({ kind: 'line', points: pointsAround(200) })).toEqual([]);
        expect(check({ kind: 'line', points: pointsAround(201) })).toHaveLength(1);
    });

    test('a rectangle, a circle and an entity without a shape get none', () => {
        expect(check({ kind: 'rectangle', width: 5_000, height: 5_000 })).toEqual([]);
        expect(check({ kind: 'circle', radius: 5_000 })).toEqual([]);

        const level = Level.createNew();
        const empty = level.createEntity(level.world, 0);
        expect(new HighDetailRule().check(empty)).toEqual([]);
    });
});
