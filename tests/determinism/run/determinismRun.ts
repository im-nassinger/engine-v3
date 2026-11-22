import type { PhysicsEngine } from '../../../src/core/physics/index.ts';
import type { LevelData } from '../../../src/core/level-data/index.ts';
import { runHeadless } from '../../../src/core/simulation/index.ts';
import { recordedInputsOf } from '../../levels/determinism/inputs/recordedInputs.ts';

// The 600 ticks of 1/60 s each the test runs: ten seconds of play.
export const DETERMINISM_TICKS = 600;
export const DETERMINISM_START = { clockTimeMs: 0 };

// One determinism run of a level with its recorded inputs, the same in Node, in the browser and when recorded.
export function runLevel(name: string, levelData: LevelData, engine: PhysicsEngine) {
    const outcome = runHeadless(levelData, engine, {
        ticks: DETERMINISM_TICKS,
        start: DETERMINISM_START,
        inputsAt: recordedInputsOf(name),
    });
    if (!outcome.ok) throw new Error(`The level was refused: ${JSON.stringify(outcome.refusal)}`);

    return outcome.value;
}
