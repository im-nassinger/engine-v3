import { describe, expect, test } from 'vitest';

import { ShapeComponent, VariablesComponent } from '../../components/index.ts';
import type { Variable } from '../../fields/index.ts';
import { LevelWriter } from '../../level-data/index.ts';
import { Level } from '../../level/index.ts';

import { startSimulation } from '../start/startSimulation.ts';
import { ScriptedEngine } from '../testing/ScriptedPhysics.ts';
import { placeBody, runTicks, transform } from '../testing/scriptedLevel.ts';

import { runHeadless } from './runHeadless.ts';

const START = { clockTimeMs: 0 };

function twoCrates() {
    const level = Level.createNew();
    const first = placeBody(level, level.world, transform(0, 0));
    const second = placeBody(level, level.world, transform(50, 0));

    return { levelData: new LevelWriter().write(level), first, second };
}

function recordedOrThrow(outcome: ReturnType<typeof runHeadless>) {
    if (!outcome.ok) throw new Error(`The level was refused: ${JSON.stringify(outcome.refusal)}`);

    return outcome.value;
}

describe('runHeadless', () => {
    test('records the stateHash after every tick, as a run built by startSimulation gives it', () => {
        const { levelData } = twoCrates();
        const recorded = recordedOrThrow(runHeadless(levelData, new ScriptedEngine(), { ticks: 3, start: START }));

        const started = startSimulation(levelData, new ScriptedEngine(), START);
        if (!started.ok) throw new Error('The level was refused.');
        const expected: string[] = [];
        for (let tick = 0; tick < 3; tick += 1) {
            runTicks(started.value, 1);
            expected.push(started.value.stateHash());
        }

        expect(recorded.map((tick) => tick.tick)).toEqual([1, 2, 3]);
        expect(recorded.map((tick) => tick.hash)).toEqual(expected);
    });

    test('names each body with its own hash, in Entities panel order', () => {
        const { levelData, first, second } = twoCrates();
        const recorded = recordedOrThrow(runHeadless(levelData, new ScriptedEngine(), { ticks: 1, start: START }));
        const bodies = recorded[0]?.bodies ?? [];

        expect(bodies.map((body) => body.entityId)).toEqual([first.id, second.id]);
        expect(bodies[0]?.hash).toMatch(/^[0-9a-f]{8}$/);
        expect(bodies[0]?.hash).not.toBe(bodies[1]?.hash);
    });

    test("the World's variables are part of the stateHash, and no variables add nothing", () => {
        const hashWith = (variables: readonly Variable[] | undefined) => {
            const level = Level.createNew();
            placeBody(level, level.world, transform(0, 0));
            if (variables !== undefined) {
                level.world.addComponent(new VariablesComponent({ variables }));
            }
            const outcome = runHeadless(new LevelWriter().write(level), new ScriptedEngine(), {
                ticks: 1,
                start: START,
            });

            return recordedOrThrow(outcome)[0]?.hash;
        };

        expect(hashWith([{ name: 'coins', value: 1 }])).not.toBe(hashWith([{ name: 'coins', value: 2 }]));
        expect(hashWith([])).toBe(hashWith(undefined));
    });

    test("asks for each tick's inputs by its number", () => {
        const { levelData } = twoCrates();
        const asked: number[] = [];
        const inputsAt = (tick: number) => {
            asked.push(tick);
            return { heldKeys: [], pressedKeys: [] };
        };

        runHeadless(levelData, new ScriptedEngine(), { ticks: 3, start: START, inputsAt });

        expect(asked).toEqual([1, 2, 3]);
    });

    test('a level the reader refuses gives its refusal and runs nothing', () => {
        const level = Level.createNew();
        level.world.requireComponent(ShapeComponent).set('geometry', { kind: 'rectangle', width: 200_001, height: 10 });
        const outcome = runHeadless(new LevelWriter().write(level), new ScriptedEngine(), { ticks: 3, start: START });

        expect(outcome.ok).toBe(false);
    });
});
