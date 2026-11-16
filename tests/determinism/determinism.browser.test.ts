import { beforeAll, describe, expect, test } from 'vitest';

import { Box2dPhysicsEngine } from '../../src/adapters/box2d/index.ts';
import type { LevelData } from '../../src/core/level-data/index.ts';

import { describeDifference } from './compare/describeDifference.ts';
import { firstDifference } from './compare/firstDifference.ts';
import { readHashFile } from './hash-files/hashFile.ts';
import { DETERMINISM_TICKS, runLevel } from './run/determinismRun.ts';

// The browser has no files to read, so Vite bundles the same level files and recorded hashes the Node test reads.
const levelFiles = import.meta.glob<LevelData>('../levels/determinism/files/*.json', {
    eager: true,
    import: 'default',
});
const hashFiles = import.meta.glob<string>('./recorded/*.hashes.txt', {
    eager: true,
    query: '?raw',
    import: 'default',
});

const engine = new Box2dPhysicsEngine();
const names = Object.keys(levelFiles)
    .map((file) => file.slice(file.lastIndexOf('/') + 1, -'.json'.length))
    .sort();

function levelFile(name: string) {
    const levelData = levelFiles[`../levels/determinism/files/${name}.json`];
    if (levelData === undefined) throw new Error(`No level file named ${name}.`);

    return levelData;
}

function recordedHashes(name: string) {
    const text = hashFiles[`./recorded/${name}.hashes.txt`];
    if (text === undefined) throw new Error(`No recorded hashes for ${name}.`);

    return readHashFile(text);
}

beforeAll(async () => {
    await engine.load();
});

describe('the determinism test in the browser', () => {
    test('every level file has its recorded hashes', () => {
        expect(names).toHaveLength(7);
        expect(Object.keys(hashFiles)).toHaveLength(7);
    });

    test.each(names)('%s matches its recorded hashes', (name) => {
        const levelData = levelFile(name);
        const recorded = recordedHashes(name);
        const difference = firstDifference(runLevel(levelData, engine), recorded);

        expect(recorded).toHaveLength(DETERMINISM_TICKS);
        expect(describeDifference(levelData, difference)).toBeUndefined();
    });
});
