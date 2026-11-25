import { describe, expect, test } from 'vitest';

import { TagsComponent, TransformComponent, TriggerComponent, VariablesComponent } from '../../components/index.ts';
import type {
    Action,
    ChangeOp,
    Check,
    Compare,
    JsonValue,
    Target,
    Trigger,
    VariableAmount,
    VariableValue,
    When,
} from '../../fields/index.ts';
import { LevelWriter } from '../../level-data/index.ts';
import { Level } from '../../level/index.ts';
import type { Entity } from '../../level/index.ts';

import { runHeadless } from './runHeadless.ts';
import type { Simulation } from '../run/Simulation.ts';
import { ScriptedEngine } from '../testing/ScriptedPhysics.ts';
import { place, placeBody, transform } from '../testing/scriptedLevel.ts';

// Fix 10: Multiply and Divide, and a variable in a value box read when its block runs.
const START = { clockTimeMs: 0 };
const NOTHING = { heldKeys: [], pressedKeys: [] };
const THIS: Target = { kind: 'this' };
const LEVEL_START: When = { kind: 'levelStart' };
// The World is entity 1 in a new level.
const WORLD: Target = { kind: 'entity', entity: 1 };
const POSITION = { kind: 'field', component: 'TransformComponent', field: 'position' } as const;

type TriggerParts = {
    readonly when: When;
    readonly checks?: readonly Check[];
    readonly actions?: readonly Action[];
};

function giveTriggers(entity: Entity, parts: readonly TriggerParts[]) {
    const triggers: Trigger[] = parts.map((part, i) => ({
        id: i + 1,
        name: null,
        on: true,
        when: part.when,
        checks: part.checks ?? [],
        actions: part.actions ?? [],
    }));

    entity.addComponent(new TriggerComponent({ triggers, nextTriggerId: triggers.length + 1 }));
}

function giveVariables(entity: Entity, values: Readonly<Record<string, VariableValue>>) {
    const variables = Object.entries(values).map(([name, value]) => ({ name, value }));
    entity.addComponent(new VariablesComponent({ variables }));
}

function levelWith(values: Readonly<Record<string, VariableValue>>) {
    const level = Level.createNew();
    giveVariables(level.world, values);

    return level;
}

function level(name: string): VariableAmount {
    return { kind: 'variable', name };
}

function own(name: string): VariableAmount {
    return { kind: 'variable', name, own: true };
}

// A change of a level's variable.
function change(name: string, op: ChangeOp, amount: JsonValue | VariableAmount): Action {
    return { kind: 'change', target: WORLD, value: { kind: 'variable', name }, op, amount };
}

function changeOwn(target: Target, name: string, op: ChangeOp, amount: JsonValue | VariableAmount): Action {
    return { kind: 'change', target, value: { kind: 'variable', name, own: true }, op, amount };
}

function levelVariableIs(name: string, compare: Compare, amount: VariableValue | VariableAmount): Check {
    return { kind: 'value', target: THIS, value: { kind: 'variable', name }, compare, amount };
}

function variablesOf(entity: Entity | undefined) {
    const variables = entity?.getComponent(VariablesComponent)?.get('variables') ?? [];

    return Object.fromEntries(variables.map((variable) => [variable.name, variable.value]));
}

type Played = {
    // The World's variables after each tick; index 0 is tick 1.
    readonly after: Record<string, VariableValue>[];
    readonly simulationAtEnd: {
        readonly ownOf: (id: number) => Record<string, VariableValue>;
        positionOf: (id: number) => unknown;
    };
    readonly customHeard: {
        readonly tick: number;
        readonly owner: number;
        readonly number: number | null | undefined;
    }[];
};

function play(levelToPlay: Level, ticks: number, engine = new ScriptedEngine()): Played {
    const after: Record<string, VariableValue>[] = [];
    const customHeard: Played['customHeard'] = [];
    let own: Record<number, Record<string, VariableValue>> = {};
    let positions: Record<number, unknown> = {};

    const afterTick = (simulation: Simulation) => {
        after.push(variablesOf(simulation.level.world));
        for (const firing of simulation.firings) {
            if (firing.when.kind !== 'custom' || firing.resumesAt !== undefined) continue;

            customHeard.push({ tick: simulation.tick, owner: firing.owner.id, number: firing.number });
        }
        own = {};
        positions = {};
        for (const entity of simulation.level.world.children) {
            own[entity.id] = variablesOf(entity);
            positions[entity.id] = entity.getComponent(TransformComponent)?.get('position');
        }
    };

    const levelData = new LevelWriter().write(levelToPlay);
    const outcome = runHeadless(levelData, engine, { ticks, start: START, afterTick });
    if (!outcome.ok) throw new Error(`The level was refused: ${JSON.stringify(outcome.refusal)}`);

    const simulationAtEnd = {
        ownOf: (id: number) => own[id] ?? {},
        positionOf: (id: number) => positions[id],
    };

    return { after, simulationAtEnd, customHeard };
}

describe('Multiply and Divide', () => {
    test('multiply and divide a number variable; dividing by 0 leaves it', () => {
        const played = levelWith({ coins: 3, half: 9, kept: 5 });
        giveTriggers(played.world, [
            {
                when: LEVEL_START,
                actions: [change('coins', 'multiply', 2), change('half', 'divide', 2), change('kept', 'divide', 0)],
            },
        ]);

        const { after } = play(played, 1);

        expect(after[0]).toEqual({ coins: 6, half: 4.5, kept: 5 });
    });

    test('a vector is multiplied or divided by one number; dividing by 0 leaves it', () => {
        const played = levelWith({});
        const doubled = place(played, played.world, transform(10, -20));
        const halved = place(played, played.world, transform(10, -20));
        const kept = place(played, played.world, transform(10, -20));
        giveTriggers(played.world, [
            {
                when: LEVEL_START,
                actions: [
                    {
                        kind: 'change',
                        target: { kind: 'entity', entity: doubled.id },
                        value: POSITION,
                        op: 'multiply',
                        amount: 2,
                    },
                    {
                        kind: 'change',
                        target: { kind: 'entity', entity: halved.id },
                        value: POSITION,
                        op: 'divide',
                        amount: 2,
                    },
                    {
                        kind: 'change',
                        target: { kind: 'entity', entity: kept.id },
                        value: POSITION,
                        op: 'divide',
                        amount: 0,
                    },
                ],
            },
        ]);

        const { simulationAtEnd } = play(played, 1);

        expect(simulationAtEnd.positionOf(doubled.id)).toEqual({ x: 20, y: -40 });
        expect(simulationAtEnd.positionOf(halved.id)).toEqual({ x: 5, y: -10 });
        expect(simulationAtEnd.positionOf(kept.id)).toEqual({ x: 10, y: -20 });
    });

    test('Body › Velocity is scaled from the speed the body has now; dividing by 0 leaves it', () => {
        const played = levelWith({});
        const ball = placeBody(played, played.world, transform(0, 0));
        const velocity = { kind: 'velocity' } as const;
        giveTriggers(ball, [
            {
                when: { kind: 'after', seconds: 3 / 60 },
                actions: [
                    { kind: 'change', target: THIS, value: velocity, op: 'multiply', amount: 0.5 },
                    { kind: 'change', target: THIS, value: velocity, op: 'divide', amount: 0 },
                ],
            },
        ]);
        const engine = new ScriptedEngine();
        engine.world.falling = false;
        let x = 0;
        const levelData = new LevelWriter().write(played);
        // The ball moves 2 px a tick: 120 px/s.
        const inputsAt = () => {
            x += 2;
            engine.world.setNextPose(ball.id, { x, y: 0, angle: 0 });

            return NOTHING;
        };
        const outcome = runHeadless(levelData, engine, { ticks: 4, start: START, inputsAt });
        expect(outcome.ok).toBe(true);

        const set = engine.world.changes.filter((made) => made.call === 'setLinearVelocity');
        expect(set).toEqual([
            { call: 'setLinearVelocity', entity: ball.id, velocity: { x: 60, y: 0 } },
            { call: 'setLinearVelocity', entity: ball.id, velocity: { x: 120, y: 0 } },
        ]);
    });
});

describe('a variable as a value, read when its block runs', () => {
    test('Change value reads the variable as it is at that moment, the level’s or the target’s own', () => {
        const played = levelWith({ bonus: 1, coins: 0 });
        const chest = place(played, played.world, transform(0, 0));
        giveVariables(chest, { step: 4, total: 1 });
        giveTriggers(played.world, [
            {
                when: LEVEL_START,
                actions: [
                    change('coins', 'add', level('bonus')),
                    change('bonus', 'set', 5),
                    change('coins', 'add', level('bonus')),
                ],
            },
        ]);
        giveTriggers(chest, [
            {
                when: LEVEL_START,
                actions: [
                    changeOwn(THIS, 'total', 'add', own('step')),
                    changeOwn(THIS, 'total', 'multiply', own('step')),
                ],
            },
        ]);

        const { after, simulationAtEnd } = play(played, 1);

        expect(after[0]).toEqual({ bonus: 5, coins: 6 });
        expect(simulationAtEnd.ownOf(chest.id)).toEqual({ step: 4, total: 20 });
    });

    test('a target lacking the own variable is skipped, the others still change', () => {
        const played = levelWith({});
        const rich = place(played, played.world, transform(0, 0));
        const poor = place(played, played.world, transform(0, 0));
        giveVariables(rich, { gold: 1, worth: 10 });
        giveVariables(poor, { gold: 1 });
        const tagged: Target = { kind: 'tagged', tag: 'chest' };
        for (const chest of [rich, poor]) {
            chest.addComponent(new TagsComponent({ tags: ['chest'] }));
        }
        giveTriggers(played.world, [{ when: LEVEL_START, actions: [changeOwn(tagged, 'gold', 'add', own('worth'))] }]);

        const { simulationAtEnd } = play(played, 1);

        expect(simulationAtEnd.ownOf(rich.id)).toEqual({ gold: 11, worth: 10 });
        expect(simulationAtEnd.ownOf(poor.id)).toEqual({ gold: 1 });
    });

    test('the If compares with the variable as it is when the check runs', () => {
        const played = levelWith({ score: 5, best: 3, first: 0, second: 0 });
        giveTriggers(played.world, [
            {
                when: LEVEL_START,
                checks: [levelVariableIs('score', 'more', level('best'))],
                actions: [change('first', 'add', 1), change('best', 'set', 10)],
            },
            {
                when: LEVEL_START,
                checks: [levelVariableIs('score', 'more', level('best'))],
                actions: [change('second', 'add', 1)],
            },
        ]);

        const { after } = play(played, 1);

        expect(after[0]).toEqual({ score: 5, best: 10, first: 1, second: 0 });
    });

    test('the If reads an own variable as the amount on its target', () => {
        const played = levelWith({});
        const guard = place(played, played.world, transform(0, 0));
        giveVariables(guard, { health: 3, limit: 2, hits: 0 });
        const healthAboveLimit: Check = {
            kind: 'value',
            target: THIS,
            value: { kind: 'variable', name: 'health', own: true },
            compare: 'more',
            amount: own('limit'),
        };
        giveTriggers(guard, [
            {
                when: { kind: 'every', seconds: 1 / 60 },
                checks: [healthAboveLimit],
                actions: [changeOwn(THIS, 'hits', 'add', 1), changeOwn(THIS, 'limit', 'add', 1)],
            },
        ]);

        const { simulationAtEnd } = play(played, 3);

        expect(simulationAtEnd.ownOf(guard.id)).toEqual({ health: 3, limit: 3, hits: 1 });
    });

    test('Wait waits the variable’s seconds as they are when it runs, and the own one of this', () => {
        const played = levelWith({ delay: 1, later: 0, soon: 0 });
        giveTriggers(played.world, [
            {
                when: LEVEL_START,
                actions: [
                    change('delay', 'set', 0.5),
                    { kind: 'wait', seconds: level('delay') },
                    change('later', 'add', 1),
                ],
            },
        ]);
        const timer = place(played, played.world, transform(0, 0));
        giveVariables(timer, { pause: 1 });
        giveTriggers(timer, [
            {
                when: LEVEL_START,
                actions: [
                    changeOwn(THIS, 'pause', 'set', 0.1),
                    { kind: 'wait', seconds: own('pause') },
                    change('soon', 'add', 1),
                ],
            },
        ]);

        const { after } = play(played, 32);

        expect(after[0]).toMatchObject({ later: 0, soon: 0 });
        expect(after[5]).toMatchObject({ soon: 0 });
        expect(after[6]).toMatchObject({ soon: 1 });
        expect(after[29]).toMatchObject({ later: 0 });
        expect(after[30]).toMatchObject({ later: 1 });
    });

    test('Fire custom event carries the variable’s number as it is when it fires; a target lacking it is skipped', () => {
        const played = levelWith({ bonus: 1 });
        const door = place(played, played.world, transform(0, 0));
        const gate = place(played, played.world, transform(0, 0));
        giveVariables(door, { power: 8 });
        giveTriggers(door, [{ when: { kind: 'custom', name: 'open' } }, { when: { kind: 'custom', name: 'shut' } }]);
        giveTriggers(gate, [{ when: { kind: 'custom', name: 'shut' } }]);
        for (const entity of [door, gate]) {
            entity.addComponent(new TagsComponent({ tags: ['door'] }));
        }
        giveTriggers(played.world, [
            {
                when: LEVEL_START,
                actions: [
                    change('bonus', 'set', 7),
                    { kind: 'fire', target: { kind: 'entity', entity: door.id }, name: 'open', amount: level('bonus') },
                    { kind: 'fire', target: { kind: 'tagged', tag: 'door' }, name: 'shut', amount: own('power') },
                ],
            },
        ]);

        const { customHeard } = play(played, 1);

        expect(customHeard).toEqual([
            { tick: 1, owner: door.id, number: 7 },
            { tick: 1, owner: door.id, number: 8 },
        ]);
    });
});
