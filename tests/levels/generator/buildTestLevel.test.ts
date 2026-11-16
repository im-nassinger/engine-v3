import { describe, expect, test } from 'vitest';
import { DerivedCaches, levelBoundsOf } from '../../../src/core/derived/index.ts';

import { buildTestLevel } from './buildTestLevel.ts';

describe('buildTestLevel', () => {
    test('holds the entities asked for, besides the World and the camera', () => {
        const { level, platforms, looseCrates, carts } = buildTestLevel(10_000);

        expect(level.entityCount).toBe(10_002);
        expect(platforms).toHaveLength(1_000);
        expect(looseCrates).toHaveLength(4_000);
        expect(carts).toHaveLength(1_000);
    });

    test('a cart holds a group inside it', () => {
        const { carts } = buildTestLevel(10);
        const [cart] = carts;

        expect(cart?.children).toHaveLength(2);
        // Each new entity goes first, so the box, built before the base crate, is the last row.
        expect(cart?.children.at(-1)?.children).toHaveLength(2);
    });

    test("everything lies inside a new level's World rectangle at 10,000 entities", () => {
        const { level } = buildTestLevel(10_000);
        const caches = new DerivedCaches(level);
        const worldRectangle = levelBoundsOf(level);
        const everything = caches.bounds.subtreeBoundsOf(level.world);
        caches.dispose();

        expect(worldRectangle).toBeDefined();
        expect(everything).toEqual(worldRectangle);
    });

    test('refuses a count that is not whole blocks', () => {
        expect(() => buildTestLevel(15)).toThrow('A test level holds a multiple of 10 entities, not 15.');
    });
});
