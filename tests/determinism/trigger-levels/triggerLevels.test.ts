import { beforeAll, describe, expect, test } from 'vitest';

import { Box2dPhysicsEngine } from '../../../src/adapters/box2d/index.ts';
import { NameComponent, VariablesComponent } from '../../../src/core/components/index.ts';
import { runHeadless } from '../../../src/core/simulation/index.ts';
import type { Simulation } from '../../../src/core/simulation/index.ts';
import type { VariableValue } from '../../../src/core/fields/index.ts';
import { recordedInputsOf } from '../../levels/determinism/inputs/recordedInputs.ts';

import { readLevelFile } from '../level-files/determinismFiles.ts';
import { DETERMINISM_START, DETERMINISM_TICKS } from '../run/determinismRun.ts';

// What one tick of a trigger level left: every variable by name, the World's as `coins` and an entity's own
// as `Door 1.door_open`, and how the run ended.
type TriggerTick = {
    readonly tick: number;
    readonly variables: Readonly<Record<string, VariableValue>>;
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
        ticks.push({
            tick: simulation.tick,
            variables: variablesIn(simulation),
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

function variablesIn(simulation: Simulation) {
    const found: Record<string, VariableValue> = {};
    for (const entity of simulation.level.entitiesInPanelOrder()) {
        const prefix =
            entity === simulation.level.world ? '' : `${entity.requireComponent(NameComponent).get('name')}.`;
        for (const variable of entity.getComponent(VariablesComponent)?.get('variables') ?? []) {
            found[`${prefix}${variable.name}`] = variable.value;
        }
    }

    return found;
}

// The first tick a variable reached each of its values, from the value it starts with.
function ticksReaching(ticks: readonly TriggerTick[], name: string, start: VariableValue = 0) {
    const reached: number[] = [];
    let last = start;
    for (const { tick, variables } of ticks) {
        const value = variables[name] ?? last;
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

    test('trigger-doors: the button fires open, each door waits and closes, and the switch flips', async () => {
        const ticks = await runTriggerLevel('trigger-doors');
        // The ball reaches the button once; both doors hear `open` in that tick and close 1 s and 2 s later.
        expect(ticksReaching(ticks, 'Button.presses')).toEqual([156]);
        expect(ticksReaching(ticks, 'opened')).toEqual([156]);
        expect(ticks.find((tick) => tick.tick === 156)?.variables['opened']).toBe(2);
        expect(ticksReaching(ticks, 'Door 1.door_open', false)).toEqual([156, 216]);
        expect(ticksReaching(ticks, 'Door 2.door_open', false)).toEqual([156, 276]);
        // `jump` pressed three times flips `lights`, and `lit` counts the two times it becomes true.
        expect(ticksReaching(ticks, 'lights', false)).toEqual([100, 300, 450]);
        expect(ticksReaching(ticks, 'lit')).toEqual([100, 450]);
    });

    test('trigger-hits: collisions are counted, destroyed bricks score and score becoming 3 wins', async () => {
        const ticks = await runTriggerLevel('trigger-hits');
        const won = ticks.find((tick) => tick.end !== null);

        // The ball's own `hits`: the floor it starts on, the wall and the floor, then the three bricks, with a
        // landing on the floor after the first two.
        expect(ticksReaching(ticks, 'Ball.hits')).toEqual([1, 111, 120, 255, 283, 370, 391, 512]);
        // Each brick hit is destroyed and its Destroyed trigger scores in the same tick; the ball rolls on
        // through the gap it left. `score` becoming 3 wins in that tick.
        expect(ticksReaching(ticks, 'score')).toEqual([255, 370, 512]);
        expect(won?.tick).toBe(512);
        expect(won?.end).toBe('won');
    });
});
