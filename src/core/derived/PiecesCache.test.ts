import { describe, expect, test } from 'vitest';

import { ShapeComponent, TransformComponent } from '../components/index.ts';
import { Level } from '../entities/index.ts';
import { PiecesCache } from './PiecesCache.ts';

function buildSquare() {
    const level = Level.createNew();
    const square = level.createEntity(level.world, 0);
    square.addComponent(new TransformComponent());
    square.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width: 100, height: 100 } }));
    const cache = new PiecesCache(level);

    return { level, square, cache };
}

describe('PiecesCache', () => {
    test("gives a shape's pieces in its own space", () => {
        const { square, cache } = buildSquare();

        const result = cache.piecesOf(square);

        expect(result?.pieces).toHaveLength(1);
        expect(result?.filledOutlines[0]).toContainEqual({ x: -50, y: -50 });
    });

    test('moving a shape keeps its pieces', () => {
        const { level, square, cache } = buildSquare();
        const group = level.createEntity(level.world, 0);
        const before = cache.piecesOf(square);

        square.requireComponent(TransformComponent).set('position', { x: 300, y: 40 });
        square.requireComponent(TransformComponent).set('rotation', 45);
        level.moveEntity(square, group, 0);

        expect(cache.piecesOf(square)).toBe(before);
    });

    test('a new geometry cuts the shape again', () => {
        const { square, cache } = buildSquare();
        cache.piecesOf(square);

        square.requireComponent(ShapeComponent).set('geometry', { kind: 'ellipse', width: 40, height: 40 });

        expect(cache.cachedCount).toBe(0);
        expect(cache.piecesOf(square)?.pieces).toEqual([{ kind: 'circle', radius: 20 }]);
    });

    test('an entity without a shape has no pieces', () => {
        const { level, cache } = buildSquare();

        expect(cache.piecesOf(level.camera)).toBeUndefined();
        expect(cache.cachedCount).toBe(0);
    });

    test('removing the shape, or the entity, forgets its pieces', () => {
        const { level, square, cache } = buildSquare();
        cache.piecesOf(square);
        square.removeComponent(ShapeComponent);

        expect(cache.piecesOf(square)).toBeUndefined();

        square.addComponent(new ShapeComponent());
        cache.piecesOf(square);
        level.removeEntity(square);

        expect(cache.cachedCount).toBe(0);
    });
});
