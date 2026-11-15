import { describe, expect, test } from 'vitest';

import { PathComponent, ShapeComponent, StyleComponent, TransformComponent } from '../components/index.ts';
import type { Entity } from '../entities/index.ts';
import { Level } from '../entities/index.ts';
import type { Bounds, ShapeGeometry } from '../geometry/index.ts';
import { BoundsCache } from './BoundsCache.ts';
import { WorldMatrixCache } from './WorldMatrixCache.ts';

const CLOSE = 1e-9;

function placeAt(level: Level, parent: Entity, x: number, y: number) {
    const entity = level.createEntity(parent, 0);
    const transform = new TransformComponent();
    transform.set('position', { x, y });
    entity.addComponent(transform);

    return entity;
}

function addShape(level: Level, parent: Entity, x: number, y: number, geometry: ShapeGeometry) {
    const entity = placeAt(level, parent, x, y);
    entity.addComponent(new ShapeComponent({ geometry }));

    return entity;
}

function buildCache(level: Level) {
    const matrices = new WorldMatrixCache(level);

    return new BoundsCache(level, matrices);
}

function sidesOf(bounds: Bounds | undefined) {
    if (bounds === undefined) return undefined;

    return [bounds.left, bounds.top, bounds.right, bounds.bottom];
}

function expectSidesClose(bounds: Bounds | undefined, expected: readonly number[]) {
    const sides = sidesOf(bounds) ?? [];

    expect(sides).toHaveLength(4);
    for (let i = 0; i < 4; i++) {
        const difference = Math.abs((sides[i] ?? 0) - (expected[i] ?? 0));
        expect(difference).toBeLessThan(CLOSE);
    }
}

describe('BoundsCache own bounds', () => {
    test('a rectangle without a style covers its edge, in level positions', () => {
        const level = Level.createNew();
        const crate = addShape(level, level.world, 100, 50, { kind: 'rectangle', width: 40, height: 20 });
        const cache = buildCache(level);

        expect(sidesOf(cache.ownBoundsOf(crate))).toEqual([80, 40, 120, 60]);
    });

    test('a new outline width grows the bounds by half of it', () => {
        const level = Level.createNew();
        const crate = addShape(level, level.world, 0, 0, { kind: 'rectangle', width: 40, height: 20 });
        crate.addComponent(new StyleComponent());
        const cache = buildCache(level);

        expect(sidesOf(cache.ownBoundsOf(crate))).toEqual([-21, -11, 21, 11]);

        crate.requireComponent(StyleComponent).set('outlineWidth', 10);

        expect(sidesOf(cache.ownBoundsOf(crate))).toEqual([-25, -15, 25, 15]);
    });

    test('the outline is stretched by the matrix like the shape', () => {
        const level = Level.createNew();
        const crate = addShape(level, level.world, 0, 0, { kind: 'rectangle', width: 40, height: 20 });
        crate.addComponent(new StyleComponent());
        crate.requireComponent(TransformComponent).set('scale', { x: 3, y: 1 });
        const cache = buildCache(level);

        expect(sidesOf(cache.ownBoundsOf(crate))).toEqual([-63, -13, 63, 13]);
    });

    test('a turned ellipse has its exact bounds', () => {
        const level = Level.createNew();
        const ball = addShape(level, level.world, 10, 20, { kind: 'ellipse', width: 100, height: 40 });
        ball.requireComponent(TransformComponent).set('rotation', 90);
        const cache = buildCache(level);

        expectSidesClose(cache.ownBoundsOf(ball), [-10, -30, 30, 70]);
    });

    test('a polygon covers its points', () => {
        const level = Level.createNew();
        const points = [
            { x: 0, y: 0 },
            { x: 30, y: -10 },
            { x: 10, y: 25 },
        ];
        const ramp = addShape(level, level.world, 5, 5, { kind: 'polygon', points });
        const cache = buildCache(level);

        expect(sidesOf(cache.ownBoundsOf(ramp))).toEqual([5, -5, 35, 30]);
    });

    test("a path covers its points and its handles, and is picked before the entity's shape", () => {
        const level = Level.createNew();
        const rope = addShape(level, level.world, 0, 0, { kind: 'rectangle', width: 1000, height: 1000 });
        const path = {
            closed: false,
            points: [
                { x: 0, y: 0, handleIn: null, handleOut: { x: 0, y: -50 }, corner: 'separate' as const },
                { x: 100, y: 0, handleIn: null, handleOut: null, corner: 'sharp' as const },
            ],
        };
        rope.addComponent(new PathComponent({ path }));
        const cache = buildCache(level);

        expect(sidesOf(cache.ownBoundsOf(rope))).toEqual([0, -50, 100, 0]);
    });

    test("the camera's bounds are its frame, centred on its position", () => {
        const level = Level.createNew();
        const cache = buildCache(level);

        expect(sidesOf(cache.ownBoundsOf(level.camera))).toEqual([-960, -540, 960, 540]);
    });

    test('a group draws nothing', () => {
        const level = Level.createNew();
        const group = placeAt(level, level.world, 0, 0);
        const cache = buildCache(level);

        expect(cache.ownBoundsOf(group)).toBeUndefined();
        expect(cache.subtreeBoundsOf(group)).toBeUndefined();
    });
});

describe('BoundsCache subtree bounds', () => {
    function buildGroupOfTwo() {
        const level = Level.createNew();
        const group = placeAt(level, level.world, 100, 0);
        const left = addShape(level, group, -50, 0, { kind: 'rectangle', width: 10, height: 10 });
        const right = addShape(level, group, 50, 0, { kind: 'rectangle', width: 10, height: 10 });
        const cache = buildCache(level);

        return { level, group, left, right, cache };
    }

    test("are the union of its own and its children's", () => {
        const { group, cache } = buildGroupOfTwo();

        expect(sidesOf(cache.subtreeBoundsOf(group))).toEqual([45, -5, 155, 5]);
    });

    test("moving a child moves its parent's subtree bounds", () => {
        const { level, group, right, cache } = buildGroupOfTwo();
        cache.subtreeBoundsOf(level.world);

        right.requireComponent(TransformComponent).set('position', { x: 50, y: 200 });

        expect(sidesOf(cache.subtreeBoundsOf(group))).toEqual([45, -5, 155, 205]);
    });

    test("changing a child's shape changes its parents' bounds", () => {
        const { group, right, cache } = buildGroupOfTwo();
        cache.subtreeBoundsOf(group);

        right.requireComponent(ShapeComponent).set('geometry', { kind: 'rectangle', width: 30, height: 10 });

        expect(sidesOf(cache.subtreeBoundsOf(group))).toEqual([45, -5, 165, 5]);
    });

    test('moving the parent moves every own bounds inside it', () => {
        const { left, group, cache } = buildGroupOfTwo();
        cache.subtreeBoundsOf(group);

        group.requireComponent(TransformComponent).set('position', { x: 0, y: 0 });

        expect(sidesOf(cache.ownBoundsOf(left))).toEqual([-55, -5, -45, 5]);
        expect(sidesOf(cache.subtreeBoundsOf(group))).toEqual([-55, -5, 55, 5]);
    });

    test('moving a child to another parent updates both', () => {
        const { level, group, right, cache } = buildGroupOfTwo();
        const other = placeAt(level, level.world, 0, 300);
        cache.subtreeBoundsOf(level.world);
        cache.subtreeBoundsOf(other);

        level.moveEntity(right, other, 0);

        expect(sidesOf(cache.subtreeBoundsOf(group))).toEqual([45, -5, 55, 5]);
        expect(sidesOf(cache.subtreeBoundsOf(other))).toEqual([45, 295, 55, 305]);
    });

    test('adding and removing a child update the parent', () => {
        const { level, group, right, cache } = buildGroupOfTwo();
        cache.subtreeBoundsOf(group);

        const far = addShape(level, group, 0, -100, { kind: 'rectangle', width: 10, height: 10 });

        expect(sidesOf(cache.subtreeBoundsOf(group))).toEqual([45, -105, 155, 5]);

        level.removeEntity(far);
        level.removeEntity(right);

        expect(sidesOf(cache.subtreeBoundsOf(group))).toEqual([45, -5, 55, 5]);
    });

    test('values are computed only when asked, and a change marks only what it touches', () => {
        const { group, left, right, cache } = buildGroupOfTwo();

        expect(cache.cachedCount).toBe(0);

        cache.subtreeBoundsOf(group);
        const leftBounds = cache.ownBoundsOf(left);
        right.requireComponent(ShapeComponent).set('geometry', { kind: 'rectangle', width: 30, height: 10 });

        expect(cache.ownBoundsOf(left)).toBe(leftBounds);
    });
});
