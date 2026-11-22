import { readFile } from 'node:fs/promises';

import { beforeAll, describe, expect, test } from 'vitest';

import { Box2dPhysicsEngine } from '../../src/adapters/box2d/index.ts';

import { describeDifference } from './compare/describeDifference.ts';
import { firstDifference } from './compare/firstDifference.ts';
import { readHashFile } from './hash-files/hashFile.ts';
import { hashFile, levelNames, readLevelFile } from './level-files/determinismFiles.ts';
import { DETERMINISM_TICKS, runLevel } from './run/determinismRun.ts';

const engine = new Box2dPhysicsEngine();
const names = await levelNames();

beforeAll(async () => {
    await engine.load();
});

describe('the determinism test', () => {
    test('every level file has its recorded hashes', () => {
        expect(names).toHaveLength(14);
    });

    test.each(names)('%s matches its recorded hashes', async (name) => {
        const levelData = await readLevelFile(name);
        const recorded = readHashFile(await readFile(hashFile(name), 'utf8'));
        const difference = firstDifference(runLevel(name, levelData, engine), recorded);

        expect(recorded).toHaveLength(DETERMINISM_TICKS);
        expect(describeDifference(levelData, difference)).toBeUndefined();
    });

    test.each(names)('%s run twice in one process gives the same run', async (name) => {
        const levelData = await readLevelFile(name);
        const difference = firstDifference(runLevel(name, levelData, engine), runLevel(name, levelData, engine));

        expect(describeDifference(levelData, difference)).toBeUndefined();
    });
});
