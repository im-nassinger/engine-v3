import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import type { LevelData } from '../../../src/core/level-data/index.ts';

const ROOT = path.join(import.meta.dirname, '..', '..', '..');
export const LEVEL_FILES = path.join(ROOT, 'tests', 'levels', 'determinism', 'files');
export const RECORDED_HASHES = path.join(ROOT, 'tests', 'determinism', 'recorded');

// The 600 ticks of 1/60 s each the test runs: ten seconds of play.
export const DETERMINISM_TICKS = 600;
export const DETERMINISM_START = { clockTimeMs: 0 };

export function levelFile(name: string) {
    return path.join(LEVEL_FILES, `${name}.json`);
}

export function hashFile(name: string) {
    return path.join(RECORDED_HASHES, `${name}.hashes.txt`);
}

// The names of the level files the test runs, in name order.
export async function levelNames() {
    const files = await readdir(LEVEL_FILES);

    return files
        .filter((file) => file.endsWith('.json'))
        .map((file) => file.slice(0, -'.json'.length))
        .sort();
}

export async function readLevelFile(name: string) {
    return JSON.parse(await readFile(levelFile(name), 'utf8')) as LevelData;
}

// The name a level file gives an entity, for a failure message.
export function entityName(levelData: LevelData, entityId: number) {
    const found = findEntity(levelData.world, entityId);
    const name = found?.components['NameComponent']?.['name'];

    return typeof name === 'string' ? name : undefined;
}

function findEntity(entity: LevelData['world'], entityId: number): LevelData['world'] | undefined {
    if (entity.id === entityId) return entity;

    for (const child of entity.children) {
        const found = findEntity(child, entityId);
        if (found !== undefined) return found;
    }

    return undefined;
}
