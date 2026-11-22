// Writes the determinism test's level files from the code in tests/levels/determinism/build/, then each
// level's recorded hashes from a run with Box2D. Run on purpose only, never by a failing test:
//   npm run determinism:record
// Recording again because the Box2D build changed also means raising the physics version.
import { mkdir, writeFile } from 'node:fs/promises';

import { Box2dPhysicsEngine } from '../../../src/adapters/box2d/index.ts';
import { LevelWriter } from '../../../src/core/level-data/index.ts';
import { DETERMINISM_LEVELS } from '../../levels/determinism/build/determinismLevels.ts';

import { writeHashFile } from '../hash-files/hashFile.ts';
import { hashFile, LEVEL_FILES, levelFile, RECORDED_HASHES } from '../level-files/determinismFiles.ts';
import { runLevel } from '../run/determinismRun.ts';

const engine = new Box2dPhysicsEngine();
await engine.load();
await mkdir(LEVEL_FILES, { recursive: true });
await mkdir(RECORDED_HASHES, { recursive: true });

for (const testLevel of DETERMINISM_LEVELS) {
    const level = testLevel.build();
    level.rename(testLevel.name);
    const levelData = new LevelWriter().write(level);
    const recorded = runLevel(testLevel.name, levelData, engine);

    await writeFile(levelFile(testLevel.name), `${JSON.stringify(levelData, undefined, 4)}\n`);
    await writeFile(hashFile(testLevel.name), writeHashFile(testLevel.name, recorded));
    console.log(`${testLevel.name}: ${recorded.length} ticks recorded.`);
}
