import { beforeAll, describe, expect, test } from 'vitest';

import { Box2dPhysicsEngine } from '../../../src/adapters/box2d/index.ts';
import { VariablesComponent } from '../../../src/core/components/index.ts';
import { runHeadless } from '../../../src/core/simulation/index.ts';
import type { Simulation } from '../../../src/core/simulation/index.ts';
import { recordedInputsOf } from '../../levels/determinism/inputs/recordedInputs.ts';

import { readLevelFile } from '../level-files/determinismFiles.ts';
import { DETERMINISM_START, DETERMINISM_TICKS } from '../run/determinismRun.ts';

// What one tick of a trigger level left: the World's variables by name, and how the run ended.
type TriggerTick = {
    readonly tick: number;
    readonly variables: Readonly<Record<string, number>>;
    readonly end: string | null;
};

const engine = new Box2dPhysicsEngine();

beforeAll(async () => {
    await engine.load();
});

// The level's run with its recorded inputs, as the determinism test runs it, read after every tick.
async function runTriggerLevel(name: string) {
    const levelData = await readLevelFile(name);
    const ticks: TriggerTick[] = [];
    const afterTick = (simulation: Simulation) => {
        const variables = simulation.level.world.requireComponent(VariablesComponent).get('variables');
        ticks.push({
            tick: simulation.tick,
            variables: Object.fromEntries(variables.map((variable) => [variable.name, variable.value])),
            end: simulation.end?.kind ?? null,
        });
    };
    const outcome = runHeadless(levelData, engine, {
        ticks: DETERMINISM_TICKS,
        start: DETERMINISM_START,
        inputsAt: recordedInputsOf(name),
        afterTick,
    });
    if (!outcome.ok) throw new Error(`The level was refused: ${JSON.stringify(outcome.refusal)}`);

    return ticks;
}

// The first tick a variable reached each of its values.
function ticksReaching(ticks: readonly TriggerTick[], name: string) {
    const reached: number[] = [];
    let last = 0;
    for (const { tick, variables } of ticks) {
        const value = variables[name] ?? 0;
        if (value !== last) {
            reached.push(tick);
            last = value;
        }
    }

    return reached;
}

describe('the determinism levels with triggers do what they are built to show', () => {
    test('trigger-coins: the pushed ball collects all five coins and the World trigger wins', async () => {
        const ticks = await runTriggerLevel('trigger-coins');
        const won = ticks.find((tick) => tick.end !== null);

        // Each coin counts once, the last after the left and the second right push, and the run ends in
        // the tick the last coin is destroyed, since its tag runs out at the end of that tick.
        expect(ticksReaching(ticks, 'coins')).toEqual([116, 159, 196, 237, 274]);
        expect(won?.tick).toBe(275);
        expect(won?.end).toBe('won');
        expect(ticks.at(-1)?.variables['coins']).toBe(5);
    });

    test('trigger-timers: every, after, a switch off and on, and Repeat at most once a second', async () => {
        const ticks = await runTriggerLevel('trigger-timers');
        // Every 0.5 s until the after-4-s trigger switches the beat off in tick 240, the beat's own firing in
        // that tick first, then every 0.5 s again from the `up` press in tick 420.
        expect(ticksReaching(ticks, 'beats')).toEqual([
            30, 60, 90, 120, 150, 180, 210, 240, 450, 480, 510, 540, 570, 600,
        ]);
        expect(ticksReaching(ticks, 'late')).toEqual([120]);
        // `jump` held from tick 60 to 330 fires at most once a second.
        expect(ticksReaching(ticks, 'held')).toEqual([60, 120, 180, 240, 300]);
    });

    test('trigger-touch-groups: a cart of three shapes is counted once going in and once leaving', async () => {
        const ticks = await runTriggerLevel('trigger-touch-groups');
        expect(ticksReaching(ticks, 'touches')).toEqual([38]);
        expect(ticksReaching(ticks, 'leaves')).toEqual([295]);
    });
});
