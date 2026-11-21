import { describe, expect, test } from 'vitest';
import { PathComponent, createV1Registry } from '../../../src/core/components/index.ts';
import { DerivedCaches, levelBoundsOf } from '../../../src/core/derived/index.ts';
import { FormatUpgrader, LevelReader, LevelWriter, V1_LEVEL_LIMITS } from '../../../src/core/level-data/index.ts';

import { buildPathLevel } from './buildPathLevel.ts';

describe('buildPathLevel', () => {
    test('holds one closed path of the points asked for among the entities asked for', () => {
        const { level, path } = buildPathLevel(10_000, 2_000);
        const stored = path.requireComponent(PathComponent).get('path');

        // The World and the camera besides them.
        expect(level.entityCount).toBe(10_002);
        expect(stored.closed).toBe(true);
        expect(stored.points).toHaveLength(2_000);
        expect(stored.points.every((point) => point.corner === 'smooth')).toBe(true);
    });

    test("lies inside a new level's World rectangle", () => {
        const { level } = buildPathLevel(10_000, 2_000);
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
        const reader = new LevelReader(createV1Registry(), V1_LEVEL_LIMITS, FormatUpgrader.createV1());
        const writer = new LevelWriter();
        const written = writer.write(buildPathLevel(30, V1_LEVEL_LIMITS.maxPathPoints).level);

        const outcome = reader.read(written);

        if (!outcome.ok) throw new Error(`The level was refused: ${JSON.stringify(outcome.refusal)}`);
        expect(writer.write(outcome.value)).toEqual(written);
    });

    test('refuses a count without room for the path', () => {
        expect(() => buildPathLevel(0, 10)).toThrow(
            'A path test level holds the path and a whole number of entities, not 0.',
        );
    });
});
