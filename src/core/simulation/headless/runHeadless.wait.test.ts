import { describe, expect, test } from 'vitest';

import { TriggerComponent, VariablesComponent } from '../../components/index.ts';
import type {
    Action,
    Check,
    EntityId,
    JsonValue,
    Repeat,
    Target,
    Trigger,
    VariableValue,
    When,
} from '../../fields/index.ts';
import { LevelWriter } from '../../level-data/index.ts';
import { Level } from '../../level/index.ts';
import type { Entity } from '../../level/index.ts';

import { runHeadless } from './runHeadless.ts';
import type { Simulation } from '../run/Simulation.ts';
import { ScriptedEngine } from '../testing/ScriptedPhysics.ts';
import { place, transform } from '../testing/scriptedLevel.ts';

const START = { clockTimeMs: 0 };
const THIS: Target = { kind: 'this' };
const OTHER: Target = { kind: 'other' };
const LEVEL_START: When = { kind: 'levelStart' };
// The World is entity 1 in a new level.
const WORLD: Target = { kind: 'entity', entity: 1 };
const EVERY_TIME: Repeat = { kind: 'everyTime' };

type TriggerParts = {
    readonly when: When;
    readonly checks?: readonly Check[];
    readonly actions?: readonly Action[];
    readonly repeat?: Repeat;
};

type HeardFiring = {
    readonly tick: number;
    readonly owner: EntityId;
    readonly triggerId: number;
    readonly resumed: boolean;
};

function giveTriggers(entity: Entity, parts: readonly TriggerParts[]) {
    const triggers: Trigger[] = parts.map((part, i) => ({
        id: i + 1,
        name: null,
        on: true,
        when: part.when,
        checks: part.checks ?? [],
        actions: part.actions ?? [],
        repeat: part.repeat ?? EVERY_TIME,
    }));

    entity.addComponent(new TriggerComponent({ triggers, nextTriggerId: triggers.length + 1 }));
}

function levelWith(values: Readonly<Record<string, VariableValue>>) {
    const level = Level.createNew();
    const variables = Object.entries(values).map(([name, value]) => ({ name, value }));
    level.world.addComponent(new VariablesComponent({ variables }));

    return level;
}

function wait(seconds: number): Action {
    return { kind: 'wait', seconds };
}

function add(name: string, amount: number): Action {
    return { kind: 'change', target: WORLD, value: { kind: 'variable', name }, op: 'add', amount };
}

function fire(target: Target, name: string): Action {
    return { kind: 'fire', target, name, amount: null };
}

function after(seconds: number): When {
    return { kind: 'after', seconds };
}

function custom(name: string): When {
    return { kind: 'custom', name };
}

function worldVariables(simulation: Simulation) {
    const variables = simulation.level.world.getComponent(VariablesComponent)?.get('variables') ?? [];

    return Object.fromEntries(variables.map((variable) => [variable.name, variable.value]));
}

// Plays the level headless and lists every firing that ran, the World's variables after each tick (index
// 0 is tick 1) and the warnings at the end.
function play(level: Level, ticks: number) {
    const heard: HeardFiring[] = [];
    const after: Record<string, JsonValue>[] = [];
    let warnings: Simulation['warnings'] = [];

    const afterTick = (simulation: Simulation) => {
        for (const firing of simulation.firings) {
            const { owner, triggerId } = firing;
            heard.push({ tick: simulation.tick, owner: owner.id, triggerId, resumed: firing.resumesAt !== undefined });
        }
        after.push(worldVariables(simulation));
        warnings = simulation.warnings;
    };

    const levelData = new LevelWriter().write(level);
    const outcome = runHeadless(levelData, new ScriptedEngine(), { ticks, start: START, afterTick });
    if (!outcome.ok) throw new Error(`The level was refused: ${JSON.stringify(outcome.refusal)}`);

    return { heard, after, warnings };
}

describe('Wait', () => {
    test('stops the actions and goes on with the rest the seconds later, in whole ticks', () => {
        const level = levelWith({ before: 0, later: 0 });
        giveTriggers(level.world, [{ when: LEVEL_START, actions: [add('before', 1), wait(1), add('later', 1)] }]);

        const { after } = play(level, 62);

        expect(after[0]).toEqual({ before: 1, later: 0 });
        expect(after[59]).toEqual({ before: 1, later: 0 });
        expect(after[60]).toEqual({ before: 1, later: 1 });
        expect(after[61]).toEqual({ before: 1, later: 1 });
    });

    test('wait 0 goes on in the next tick, and two waits add up', () => {
        const level = levelWith({ n: 0 });
        giveTriggers(level.world, [{ when: LEVEL_START, actions: [wait(0), add('n', 1), wait(0.5), add('n', 10)] }]);

        const { after } = play(level, 33);

        expect(after.map((variables) => variables['n']).slice(0, 3)).toEqual([0, 1, 1]);
        expect(after[30]?.['n']).toBe(1);
        expect(after[31]?.['n']).toBe(11);
    });

    test('a resumed run asks neither its checks nor its Repeat again', () => {
        const level = levelWith({ gate: 0, closed: 0 });
        const isOpen: Check = {
            kind: 'value',
            target: { kind: 'this' },
            value: { kind: 'variable', name: 'gate' },
            compare: 'is',
            amount: 0,
        };
        giveTriggers(level.world, [
            {
                when: LEVEL_START,
                checks: [isOpen],
                repeat: { kind: 'oncePerRun' },
                actions: [add('gate', 1), wait(1), add('closed', 1)],
            },
        ]);

        const { after } = play(level, 61);

        expect(after[60]).toEqual({ gate: 1, closed: 1 });
    });

    test('resumes after the timers and before the touches, due runs by trigger order, then by start', () => {
        const level = levelWith({});
        const top = place(level, level.world, transform(0, 0));
        const below = place(level, level.world, transform(10, 0));
        // Due on tick 61: below's started on tick 1, top's on tick 30, the World's timer on tick 61.
        giveTriggers(top, [{ when: after(0.5), actions: [wait(31 / 60)] }]);
        giveTriggers(below, [
            { when: LEVEL_START, actions: [fire(THIS, 'go'), fire(THIS, 'go')] },
            { when: custom('go'), actions: [wait(1)] },
        ]);
        giveTriggers(level.world, [{ when: after(61 / 60) }]);

        const { heard } = play(level, 61);

        expect(heard.filter((firing) => firing.tick === 61)).toEqual([
            { tick: 61, owner: level.world.id, triggerId: 1, resumed: false },
            { tick: 61, owner: top.id, triggerId: 1, resumed: true },
            { tick: 61, owner: below.id, triggerId: 2, resumed: true },
            { tick: 61, owner: below.id, triggerId: 2, resumed: true },
        ]);
    });

    test('two firings during one wait each get their own run', () => {
        const level = levelWith({ n: 0 });
        giveTriggers(level.world, [
            { when: LEVEL_START, actions: [fire(THIS, 'go'), fire(THIS, 'go')] },
            { when: custom('go'), actions: [wait(1), add('n', 1)] },
        ]);

        const { after } = play(level, 61);

        expect(after[59]?.['n']).toBe(0);
        expect(after[60]?.['n']).toBe(2);
    });

    test('a waiting run keeps `other`, and skips the actions on it once it is destroyed', () => {
        const level = levelWith({ n: 0 });
        const button = place(level, level.world, transform(0, 0));
        const door = place(level, level.world, transform(10, 0));
        const doorTarget: Target = { kind: 'entity', entity: door.id };
        const buttonTarget: Target = { kind: 'entity', entity: button.id };
        giveTriggers(button, [{ when: LEVEL_START, actions: [fire(doorTarget, 'open')] }]);
        giveTriggers(door, [
            { when: custom('open'), actions: [wait(1), { kind: 'destroy', target: OTHER }, add('n', 1)] },
        ]);
        giveTriggers(level.world, [{ when: after(0.5), actions: [{ kind: 'destroy', target: buttonTarget }] }]);

        const { after: variables } = play(level, 61);

        expect(variables[60]?.['n']).toBe(1);
    });

    test('switching the trigger off cancels its waiting runs, and switching it on again brings none back', () => {
        const level = levelWith({ n: 0 });
        const switchTrigger = (on: boolean): Action => ({
            kind: 'change',
            target: THIS,
            value: { kind: 'triggerOn', trigger: 1 },
            op: 'set',
            amount: on,
        });
        giveTriggers(level.world, [
            { when: LEVEL_START, actions: [wait(1), add('n', 1)] },
            { when: after(0.5), actions: [switchTrigger(false), switchTrigger(true)] },
        ]);

        const { after: variables } = play(level, 70);

        expect(variables[69]?.['n']).toBe(0);
    });

    test("removing the trigger's entity cancels its waiting runs", () => {
        const level = levelWith({ n: 0 });
        const door = place(level, level.world, transform(0, 0));
        const doorTarget: Target = { kind: 'entity', entity: door.id };
        giveTriggers(door, [{ when: LEVEL_START, actions: [wait(1), add('n', 1)] }]);
        giveTriggers(level.world, [{ when: after(0.5), actions: [{ kind: 'destroy', target: doorTarget }] }]);

        const { after: variables, heard } = play(level, 70);

        expect(variables[69]?.['n']).toBe(0);
        expect(heard.some((firing) => firing.resumed)).toBe(false);
    });

    test('the 33rd waiting run of a trigger is dropped with one warning; what came before its Wait still ran', () => {
        const level = levelWith({ started: 0, done: 0 });
        const fires = Array.from({ length: 34 }, () => fire(THIS, 'go'));
        giveTriggers(level.world, [
            { when: LEVEL_START, actions: fires },
            { when: custom('go'), actions: [add('started', 1), wait(1), add('done', 1)] },
        ]);

        const { after: variables, warnings } = play(level, 61);

        expect(variables[60]).toEqual({ started: 34, done: 32 });
        expect(warnings).toEqual([{ kind: 'tooManyWaitingRuns' }]);
    });

    test('Restart starts the next run with no waiting runs', () => {
        const level = levelWith({ n: 0 });
        giveTriggers(level.world, [
            { when: LEVEL_START, actions: [wait(2), add('n', 1)] },
            { when: after(1.5), actions: [{ kind: 'restart' }] },
        ]);
        const levelData = new LevelWriter().write(level);
        const ends: (Simulation['end'] | null)[] = [];
        const values: JsonValue[] = [];
        const record = (simulation: Simulation) => {
            ends.push(simulation.end);
            values.push(worldVariables(simulation)['n'] ?? null);
        };

        // The page starts a new run from the same level when one ends with Restart.
        runHeadless(levelData, new ScriptedEngine(), { ticks: 90, start: START, afterTick: record });
        expect(ends.at(-1)?.kind).toBe('restart');
        values.length = 0;
        runHeadless(levelData, new ScriptedEngine(), { ticks: 89, start: START, afterTick: record });

        expect(values.every((value) => value === 0)).toBe(true);
    });
});
