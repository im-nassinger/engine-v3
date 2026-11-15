import { describe, expect, test } from 'vitest';

import { ShapeComponent } from '../components/index.ts';
import { Level } from '../entities/index.ts';
import { Bounds } from '../geometry/index.ts';

import { levelBoundsOf } from './levelBoundsOf.ts';

describe('levelBoundsOf', () => {
    test("a new level's bounds are its World's rectangle, centred on the origin", () => {
        const level = Level.createNew();

        expect(levelBoundsOf(level)).toEqual(new Bounds(-10000, -5000, 10000, 5000));
    });

    test('they follow a change to the rectangle', () => {
        const level = Level.createNew();
        const shape = level.world.requireComponent(ShapeComponent);

        shape.set('geometry', { kind: 'rectangle', width: 400, height: 300 });

        expect(levelBoundsOf(level)).toEqual(new Bounds(-200, -150, 200, 150));
    });

    test('a World without a rectangle has no bounds', () => {
        const level = Level.createEmpty(1, 2);

        expect(levelBoundsOf(level)).toBeUndefined();
    });
});
