import type { LevelData, ReadOutcome } from '../../level-data/index.ts';
import type { PhysicsEngine } from '../../physics/index.ts';

import type { BodyHash } from '../hash/bodyHashes.ts';
import type { RunStart } from '../run/RunStart.ts';
import type { TickInputs } from '../inputs/TickInputs.ts';
import { startSimulation } from '../start/startSimulation.ts';

const NOTHING_HELD: TickInputs = { heldKeys: [], pressedKeys: [] };

export type HeadlessOptions = {
    readonly ticks: number;
    readonly start: RunStart;
    // What the player holds on each tick, by its number from 1; nothing when it isn't given.
    readonly inputsAt?: (tick: number) => TickInputs;
};

// The state after one tick: the run's stateHash, and one hash per body to name the first that differs.
export type HeadlessTick = {
    readonly tick: number;
    readonly hash: string;
    readonly bodies: readonly BodyHash[];
};

// A run with no page and no worker, built by startSimulation exactly as the game worker builds one,
// recording the state after every tick. The engine must be loaded already.
export function runHeadless(
    levelData: LevelData,
    engine: PhysicsEngine,
    options: HeadlessOptions,
): ReadOutcome<HeadlessTick[]> {
    const started = startSimulation(levelData, engine, options.start);
    if (!started.ok) return started;

    const simulation = started.value;
    const recorded: HeadlessTick[] = [];

    try {
        for (let tick = 1; tick <= options.ticks; tick += 1) {
            simulation.runTick(options.inputsAt?.(tick) ?? NOTHING_HELD);
            recorded.push({ tick, hash: simulation.stateHash(), bodies: simulation.bodyHashes() });
        }
    } finally {
        simulation.destroy();
    }

    return { ok: true, value: recorded };
}
