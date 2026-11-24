import { describe, expect, test } from 'vitest';
import { DerivedCaches, levelBoundsOf } from '../../../src/core/derived/index.ts';
import { createV1Registry } from '../../../src/core/components/index.ts';
import { FormatUpgrader, LevelReader, LevelWriter, V1_LEVEL_LIMITS } from '../../../src/core/level-data/index.ts';

import { buildTestLevel } from './buildTestLevel.ts';

// Building and measuring 100,000 entities takes a few seconds, longer while every test file runs at once.
const LARGE_LEVEL_TIMEOUT_MS = 60_000;

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

    test('a count that is not whole blocks ends with the first entities of a block', () => {
        const { level, platforms, looseCrates, carts } = buildTestLevel(18);
        const [, lastCart] = carts;

        expect(level.entityCount).toBe(20);
        expect(platforms).toHaveLength(2);
        expect(looseCrates).toHaveLength(8);
        // The last block's cart, its box and the box's left crate.
        expect(lastCart?.children).toHaveLength(1);
        expect(lastCart?.children[0]?.children).toHaveLength(1);
    });

    test(
        'at the limit, counting the World and the camera, it fits the largest World rectangle',
        () => {
            const { level } = buildTestLevel(V1_LEVEL_LIMITS.maxEntities - 2);
            const caches = new DerivedCaches(level);
            const everything = caches.bounds.subtreeBoundsOf(level.world);
            caches.dispose();

            expect(level.entityCount).toBe(V1_LEVEL_LIMITS.maxEntities);
            expect(everything?.width).toBeLessThanOrEqual(V1_LEVEL_LIMITS.maxLevelSize);
            expect(everything?.height).toBeLessThanOrEqual(V1_LEVEL_LIMITS.maxLevelSize);
        },
        LARGE_LEVEL_TIMEOUT_MS,
    );

    test('is a level the game reads back as it was written', () => {
        const reader = new LevelReader(createV1Registry(), V1_LEVEL_LIMITS, FormatUpgrader.createCurrent());
        const writer = new LevelWriter();
        const written = writer.write(buildTestLevel(25).level);

        const outcome = reader.read(written);

        if (!outcome.ok) throw new Error(`The test level was refused: ${JSON.stringify(outcome.refusal)}`);
        expect(writer.write(outcome.value)).toEqual(written);
    });

    test('refuses a count that is not a whole number', () => {
        expect(() => buildTestLevel(1.5)).toThrow('A test level holds a whole number of entities, not 1.5.');
    });
});
