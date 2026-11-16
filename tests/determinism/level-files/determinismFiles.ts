import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import type { LevelData } from '../../../src/core/level-data/index.ts';

const ROOT = path.join(import.meta.dirname, '..', '..', '..');
export const LEVEL_FILES = path.join(ROOT, 'tests', 'levels', 'determinism', 'files');
export const RECORDED_HASHES = path.join(ROOT, 'tests', 'determinism', 'recorded');

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
