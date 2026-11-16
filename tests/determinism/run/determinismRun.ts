import type { PhysicsEngine } from '../../../src/core/physics/index.ts';
import type { LevelData } from '../../../src/core/level-data/index.ts';
import { runHeadless } from '../../../src/core/simulation/index.ts';

// The 600 ticks of 1/60 s each the test runs: ten seconds of play.
export const DETERMINISM_TICKS = 600;
export const DETERMINISM_START = { clockTimeMs: 0 };

// One determinism run of a level, the same in Node and in the browser.
export function runLevel(levelData: LevelData, engine: PhysicsEngine) {
    const outcome = runHeadless(levelData, engine, { ticks: DETERMINISM_TICKS, start: DETERMINISM_START });
    if (!outcome.ok) throw new Error(`The level was refused: ${JSON.stringify(outcome.refusal)}`);

    return outcome.value;
}
