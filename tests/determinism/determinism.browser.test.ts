import { beforeAll, describe, expect, test } from 'vitest';

import { Box2dPhysicsEngine } from '../../src/adapters/box2d/index.ts';

import {
    bundledHashFileCount,
    bundledLevelFile,
    bundledLevelNames,
    bundledRecordedHashes,
} from './bundled/bundledLevels.ts';
import { describeDifference } from './compare/describeDifference.ts';
import { firstDifference } from './compare/firstDifference.ts';
import { DETERMINISM_TICKS, runLevel } from './run/determinismRun.ts';

const engine = new Box2dPhysicsEngine();

beforeAll(async () => {
    await engine.load();
});

describe('the determinism test in the browser', () => {
    test('every level file has its recorded hashes', () => {
        expect(bundledLevelNames).toHaveLength(16);
        expect(bundledHashFileCount).toBe(16);
    });

    test.each(bundledLevelNames)('%s matches its recorded hashes', (name) => {
        const levelData = bundledLevelFile(name);
        const recorded = bundledRecordedHashes(name);
        const difference = firstDifference(runLevel(name, levelData, engine), recorded);

        expect(recorded).toHaveLength(DETERMINISM_TICKS);
        expect(describeDifference(levelData, difference)).toBeUndefined();
    });
});
