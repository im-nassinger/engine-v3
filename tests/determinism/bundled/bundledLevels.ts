import type { LevelData } from '../../../src/core/level-data/index.ts';

import { readHashFile } from '../hash-files/hashFile.ts';

// A browser has no files to read, so Vite bundles the same level files and recorded hashes the Node test reads.
// The browser test and the determinism page both run them.
const levelFiles = import.meta.glob<LevelData>('../../levels/determinism/files/*.json', {
    eager: true,
    import: 'default',
});
const hashFiles = import.meta.glob<string>('../recorded/*.hashes.txt', {
    eager: true,
    query: '?raw',
    import: 'default',
});

export const bundledLevelNames = Object.keys(levelFiles)
    .map((file) => file.slice(file.lastIndexOf('/') + 1, -'.json'.length))
    .sort();

export const bundledHashFileCount = Object.keys(hashFiles).length;

export function bundledLevelFile(name: string) {
    const levelData = levelFiles[`../../levels/determinism/files/${name}.json`];
    if (levelData === undefined) throw new Error(`No level file named ${name}.`);

    return levelData;
}

export function bundledRecordedHashes(name: string) {
    const text = hashFiles[`../recorded/${name}.hashes.txt`];
    if (text === undefined) throw new Error(`No recorded hashes for ${name}.`);

    return readHashFile(text);
}
