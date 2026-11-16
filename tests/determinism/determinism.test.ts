import { readFile } from 'node:fs/promises';

import { beforeAll, describe, expect, test } from 'vitest';

import { Box2dPhysicsEngine } from '../../src/adapters/box2d/index.ts';
import type { LevelData } from '../../src/core/level-data/index.ts';
import { runHeadless } from '../../src/core/simulation/index.ts';

import { firstDifference } from './compare/firstDifference.ts';
import type { Difference } from './compare/firstDifference.ts';
import { readHashFile } from './hash-files/hashFile.ts';
import {
    DETERMINISM_START,
    DETERMINISM_TICKS,
    entityName,
    hashFile,
    levelNames,
    readLevelFile,
} from './level-files/determinismFiles.ts';

const engine = new Box2dPhysicsEngine();
const names = await levelNames();

beforeAll(async () => {
    await engine.load();
});

function run(levelData: LevelData) {
    const outcome = runHeadless(levelData, engine, { ticks: DETERMINISM_TICKS, start: DETERMINISM_START });
    if (!outcome.ok) throw new Error(`The level was refused: ${JSON.stringify(outcome.refusal)}`);

    return outcome.value;
}

// "tick 37, first at body 5 (Crate 1.3)", so a failure points at the cause.
function describeDifference(levelData: LevelData, difference: Difference | undefined) {
    if (difference === undefined) return undefined;

    const { tick, entityId } = difference;
    if (entityId === undefined) return `tick ${tick}, in no body`;

    return `tick ${tick}, first at body ${entityId} (${entityName(levelData, entityId) ?? 'no name'})`;
}

describe('the determinism test', () => {
    test('every level file has its recorded hashes', () => {
        expect(names).toHaveLength(7);
    });

    test.each(names)('%s matches its recorded hashes', async (name) => {
        const levelData = await readLevelFile(name);
        const recorded = readHashFile(await readFile(hashFile(name), 'utf8'));

        expect(recorded).toHaveLength(DETERMINISM_TICKS);
        expect(describeDifference(levelData, firstDifference(run(levelData), recorded))).toBeUndefined();
    });

    test.each(names)('%s run twice in one process gives the same run', async (name) => {
        const levelData = await readLevelFile(name);

        expect(describeDifference(levelData, firstDifference(run(levelData), run(levelData)))).toBeUndefined();
    });
});
