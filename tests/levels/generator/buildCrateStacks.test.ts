import { describe, expect, test } from 'vitest';
import { BodyComponent } from '../../../src/core/components/index.ts';
import { createV1Registry } from '../../../src/core/components/index.ts';
import { DerivedCaches, levelBoundsOf } from '../../../src/core/derived/index.ts';
import { FormatUpgrader, LevelReader, LevelWriter, V1_LEVEL_LIMITS } from '../../../src/core/level-data/index.ts';

import { buildCrateStacks } from './buildCrateStacks.ts';

describe('buildCrateStacks', () => {
    test('holds the Dynamic crates asked for on one Static ground', () => {
        const { level, ground, crates } = buildCrateStacks(1_000);

        // The World, the camera and the ground besides the crates.
        expect(level.entityCount).toBe(1_003);
        expect(crates).toHaveLength(1_000);
        expect(ground.getComponent(BodyComponent)?.get('type')).toBe('static');
        expect(crates.every((crate) => crate.getComponent(BodyComponent)?.get('type') === 'dynamic')).toBe(true);
    });

    test("lies inside a new level's World rectangle", () => {
        const { level } = buildCrateStacks(1_000);
        const caches = new DerivedCaches(level);
        const worldRectangle = levelBoundsOf(level);
        const everything = caches.bounds.subtreeBoundsOf(level.world);
        caches.dispose();

        if (worldRectangle === undefined || everything === undefined) throw new Error('The level has no bounds.');
        expect(everything.left).toBeGreaterThanOrEqual(worldRectangle.left);
        expect(everything.right).toBeLessThanOrEqual(worldRectangle.right);
        expect(everything.top).toBeGreaterThanOrEqual(worldRectangle.top);
        expect(everything.bottom).toBeLessThanOrEqual(worldRectangle.bottom);
    });

    test('is a level the game reads back as it was written', () => {
        const reader = new LevelReader(createV1Registry(), V1_LEVEL_LIMITS, FormatUpgrader.createCurrent());
        const writer = new LevelWriter();
        const written = writer.write(buildCrateStacks(25).level);

        const outcome = reader.read(written);

        if (!outcome.ok) throw new Error(`The level was refused: ${JSON.stringify(outcome.refusal)}`);
        expect(writer.write(outcome.value)).toEqual(written);
    });

    test('refuses a count that is not a whole number', () => {
        expect(() => buildCrateStacks(-1)).toThrow('A level of crate stacks holds a whole number of crates, not -1.');
    });
});
