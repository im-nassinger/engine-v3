import type { PhysicsEngine } from '../../../../../src/core/physics/index.ts';
import { NameComponent } from '../../../../../src/core/components/index.ts';
import { LevelWriter } from '../../../../../src/core/level-data/index.ts';
import type { LevelData } from '../../../../../src/core/level-data/index.ts';
import { runHeadless } from '../../../../../src/core/simulation/index.ts';
import type { Simulation, TickInputs } from '../../../../../src/core/simulation/index.ts';

import { buildChase } from '../buildChase.ts';

// Plays the chase headless with a player that holds right and presses jump at each take-off point, the
// way a person who knows the course would. Gives back how the run ended and where the two were.
export type TakeOff = { readonly x: number; readonly holdTicks: number };

// Where to jump, left to right, and for how many ticks to hold the key (20 is a full jump).
export const TAKE_OFFS: readonly TakeOff[] = [
    { x: -5960, holdTicks: 12 },
    { x: -5560, holdTicks: 20 },
    { x: -4880, holdTicks: 20 },
    { x: -4320, holdTicks: 20 },
    { x: -3020, holdTicks: 20 },
    { x: -1540, holdTicks: 20 },
    { x: -1215, holdTicks: 20 },
    { x: -880, holdTicks: 14 },
    { x: -540, holdTicks: 20 },
    { x: -210, holdTicks: 10 },
    { x: 990, holdTicks: 14 },
    { x: 2600, holdTicks: 12 },
    { x: 3060, holdTicks: 14 },
    { x: 3660, holdTicks: 20 },
];

export type ChaseRun = {
    readonly end: string | null;
    readonly endTick: number;
    readonly blob: { readonly x: number; readonly y: number };
    readonly monster: { readonly x: number; readonly y: number };
    readonly warnings: number;
    // The smallest lead the Blob had over the monster, in level pixels between their middles, after the start.
    readonly closest: number;
};

function idOf(simulation: Simulation, name: string) {
    for (const entity of simulation.level.entitiesInPanelOrder()) {
        if (entity.getComponent(NameComponent)?.get('name') === name) return entity.id;
    }
    throw new Error(`The level has no ${name}.`);
}

export function chaseLevelData(): LevelData {
    return new LevelWriter().write(buildChase().level);
}

export function runChase(
    engine: PhysicsEngine,
    ticks: number,
    takeOffs: readonly TakeOff[] = TAKE_OFFS,
    startTick = 1,
) {
    const blob = { x: Number.NaN, y: Number.NaN };
    const monster = { x: Number.NaN, y: Number.NaN };
    let next = 0;
    let jumpUntil = -1;
    let end: string | null = null;
    let endTick = -1;
    let warnings = 0;
    let closest = Number.POSITIVE_INFINITY;

    const inputsAt = (tick: number): TickInputs => {
        if (tick < startTick) return { heldKeys: [], pressedKeys: [] };
        const takeOff = takeOffs[next];
        let pressed = false;
        if (takeOff !== undefined && blob.x >= takeOff.x) {
            jumpUntil = tick + takeOff.holdTicks;
            pressed = true;
            next++;
        }
        const held = ['ArrowRight', ...(tick <= jumpUntil ? ['Space'] : [])];
        const pressedKeys = tick === startTick ? ['ArrowRight'] : [];

        return { heldKeys: held, pressedKeys: pressed ? [...pressedKeys, 'Space'] : pressedKeys };
    };

    const afterTick = (simulation: Simulation) => {
        const blobId = idOf(simulation, 'Blob');
        const monsterId = idOf(simulation, 'Gloom');
        const report = simulation.takeReport();
        for (let i = 0; i < report.poses.length; i += 5) {
            const id = report.poses[i];
            if (id !== blobId && id !== monsterId) continue;
            const target = id === blobId ? blob : monster;
            target.x = report.poses[i + 1] ?? target.x;
            target.y = report.poses[i + 2] ?? target.y;
        }
        warnings = simulation.warnings.length;
        if (simulation.tick > 120 && end === null) {
            closest = Math.min(closest, blob.x - monster.x);
        }
        if (end === null && simulation.end !== null) {
            end = simulation.end.kind;
            endTick = simulation.tick;
        }
    };

    const outcome = runHeadless(chaseLevelData(), engine, { ticks, start: { clockTimeMs: 0 }, inputsAt, afterTick });
    if (!outcome.ok) throw new Error(`The level was refused: ${JSON.stringify(outcome.refusal)}`);
    const run: ChaseRun = { end, endTick, blob: { ...blob }, monster: { ...monster }, warnings, closest };

    return run;
}
