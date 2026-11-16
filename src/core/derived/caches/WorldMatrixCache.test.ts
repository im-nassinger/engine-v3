import { describe, expect, test } from 'vitest';

import { TransformComponent } from '../../components/index.ts';
import type { Entity } from '../../level/index.ts';
import { Level } from '../../level/index.ts';
import { Matrix2D } from '../../geometry/index.ts';
import type { TransformValues } from '../../geometry/index.ts';

import { WorldMatrixCache } from './WorldMatrixCache.ts';

function addPlaced(level: Level, parent: Entity, values: TransformValues) {
    const entity = level.createEntity(parent, 0);
    entity.addComponent(new TransformComponent(values));

    return entity;
}

function placeAt(level: Level, parent: Entity, x: number, y: number) {
    return addPlaced(level, parent, { position: { x, y }, rotation: 0, scale: { x: 1, y: 1 }, skew: 0 });
}

function expectMatricesClose(actual: Matrix2D, expected: Matrix2D, tolerance: number) {
    const actualEntries = [actual.a, actual.b, actual.c, actual.d, actual.tx, actual.ty];
    const expectedEntries = [expected.a, expected.b, expected.c, expected.d, expected.tx, expected.ty];

    for (let i = 0; i < actualEntries.length; i++) {
        const difference = Math.abs((actualEntries[i] ?? 0) - (expectedEntries[i] ?? 0));
        expect(difference).toBeLessThan(tolerance);
    }
}

describe('WorldMatrixCache', () => {
    test("a child's matrix is its parent's times its own", () => {
        const level = Level.createNew();
        const group = placeAt(level, level.world, 100, 50);
        const child = placeAt(level, group, 10, 5);
        const cache = new WorldMatrixCache(level);

        const levelPosition = cache.matrixOf(child).apply({ x: 0, y: 0 });

        expect(levelPosition).toEqual({ x: 110, y: 55 });
    });

    test('values are computed only when asked, and kept', () => {
        const level = Level.createNew();
        const group = placeAt(level, level.world, 100, 50);
        placeAt(level, group, 10, 5);
        const cache = new WorldMatrixCache(level);

        expect(cache.cachedCount).toBe(0);

        const first = cache.matrixOf(group);
        const second = cache.matrixOf(group);

        expect(second).toBe(first);
        expect(cache.cachedCount).toBe(2);
    });

    test("changing a parent's transform marks its whole subtree", () => {
        const level = Level.createNew();
        const group = placeAt(level, level.world, 100, 50);
        const child = placeAt(level, group, 10, 5);
        const sibling = placeAt(level, level.world, 0, 0);
        const cache = new WorldMatrixCache(level);
        cache.matrixOf(child);
        const siblingMatrix = cache.matrixOf(sibling);

        group.requireComponent(TransformComponent).set('position', { x: 200, y: 50 });

        expect(cache.cachedCount).toBe(2);
        expect(cache.matrixOf(child).apply({ x: 0, y: 0 })).toEqual({ x: 210, y: 55 });
        expect(cache.matrixOf(sibling)).toBe(siblingMatrix);
    });

    test('moving an entity marks its subtree', () => {
        const level = Level.createNew();
        const from = placeAt(level, level.world, 100, 0);
        const to = placeAt(level, level.world, 0, 300);
        const child = placeAt(level, from, 10, 0);
        const cache = new WorldMatrixCache(level);
        cache.matrixOf(child);

        level.moveEntity(child, to, 0);

        expect(cache.matrixOf(child).apply({ x: 0, y: 0 })).toEqual({ x: 10, y: 300 });
    });

    test('a removed entity is forgotten', () => {
        const level = Level.createNew();
        const crate = placeAt(level, level.world, 1, 1);
        const cache = new WorldMatrixCache(level);
        cache.matrixOf(crate);

        level.removeEntity(crate);

        expect(cache.cachedCount).toBe(1);
    });

    test('moving an entity between parents keeps its level matrix, with skew in both parents', () => {
        const level = Level.createNew();
        const oldParent = addPlaced(level, level.world, {
            position: { x: 120, y: -40 },
            rotation: 30,
            scale: { x: 2, y: 0.5 },
            skew: 25,
        });
        const newParent = addPlaced(level, level.world, {
            position: { x: -300, y: 75 },
            rotation: -110,
            scale: { x: -1.5, y: 3 },
            skew: -40,
        });
        const moved = addPlaced(level, oldParent, {
            position: { x: 15, y: 8 },
            rotation: 70,
            scale: { x: 1.2, y: -0.8 },
            skew: 10,
        });
        const cache = new WorldMatrixCache(level);
        const oldLevelMatrix = cache.matrixOf(moved);

        const newParentInverse = cache.matrixOf(newParent).invert();
        if (newParentInverse === undefined) throw new Error('The new parent can be inverted.');
        const newLocalMatrix = newParentInverse.multiply(oldLevelMatrix);
        const newValues = newLocalMatrix.decompose();
        level.moveEntity(moved, newParent, 0);
        const transform = moved.requireComponent(TransformComponent);
        transform.set('position', newValues.position);
        transform.set('rotation', newValues.rotation);
        transform.set('scale', newValues.scale);
        transform.set('skew', newValues.skew);

        expectMatricesClose(cache.matrixOf(moved), oldLevelMatrix, 1e-9);
    });

    test("a body's matrix comes from the body matrix source, and its children follow it", () => {
        const level = Level.createNew();
        const group = placeAt(level, level.world, 100, 50);
        const body = placeAt(level, group, 10, 5);
        const child = placeAt(level, body, 1, 2);
        let bodyMatrix = Matrix2D.fromTransform({
            position: { x: 300, y: 0 },
            rotation: 0,
            scale: { x: 1, y: 1 },
            skew: 0,
        });
        const source = { matrixOf: (entity: Entity) => (entity === body ? bodyMatrix : undefined) };
        const cache = new WorldMatrixCache(level, source);

        expect(cache.matrixOf(child).apply({ x: 0, y: 0 })).toEqual({ x: 301, y: 2 });

        bodyMatrix = Matrix2D.fromTransform({
            position: { x: 400, y: 0 },
            rotation: 0,
            scale: { x: 1, y: 1 },
            skew: 0,
        });
        expect(cache.matrixOf(child).apply({ x: 0, y: 0 })).toEqual({ x: 301, y: 2 });

        cache.markBodyMoved(body);
        expect(cache.matrixOf(child).apply({ x: 0, y: 0 })).toEqual({ x: 401, y: 2 });
        expect(cache.matrixOf(group).apply({ x: 0, y: 0 })).toEqual({ x: 100, y: 50 });
    });
});
