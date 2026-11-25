import { describe, expect, test } from 'vitest';

import { TagsComponent, TriggerComponent, VariablesComponent } from '../../components/index.ts';
import type {
    Action,
    ChangeOp,
    Check,
    Compare,
    EntityId,
    JsonValue,
    Target,
    Trigger,
    VariableRef,
    VariableValue,
    When,
} from '../../fields/index.ts';
import { LevelWriter } from '../../level-data/index.ts';
import { Level } from '../../level/index.ts';
import type { Entity } from '../../level/index.ts';

import { runHeadless } from './runHeadless.ts';
import type { Simulation } from '../run/Simulation.ts';
import { startSimulation } from '../start/startSimulation.ts';
import { ScriptedEngine } from '../testing/ScriptedPhysics.ts';
import { place, transform } from '../testing/scriptedLevel.ts';

const START = { clockTimeMs: 0 };
const NOTHING = { heldKeys: [], pressedKeys: [] };
const THIS: Target = { kind: 'this' };
const LEVEL_START: When = { kind: 'levelStart' };
// The World is entity 1 in a new level.
const WORLD: Target = { kind: 'entity', entity: 1 };
const POWERS_OF_TEN = [1, 10, 100, 1000, 10_000, 100_000, 1_000_000];

type TriggerParts = {
    readonly when: When;
    readonly checks?: readonly Check[];
    readonly actions?: readonly Action[];
};

type HeardFiring = {
    readonly tick: number;
    readonly owner: EntityId;
    readonly kind: When['kind'];
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

// A change of the level's variable, on the World.
function changeLevel(name: string, op: ChangeOp, amount: JsonValue | null): Action {
    return { kind: 'change', target: WORLD, value: { kind: 'variable', name }, op, amount };
}

// A change of the target's own variable.
function changeOwn(target: Target, name: string, op: ChangeOp, amount: JsonValue | null): Action {
    return { kind: 'change', target, value: { kind: 'variable', name, own: true }, op, amount };
}

const LEVEL = (name: string): VariableRef => ({ owner: 'level', name });
const OWN = (name: string, target: Target = THIS): VariableRef => ({ owner: 'own', target, name });

function changes(variable: VariableRef, becomes?: { compare: Compare; value: VariableValue }): When {
    return { kind: 'variableChanged', variable, becomes: becomes ?? null };
}

// The value check reading a variable: the level's on the World, an own one on its target.
function compare(variable: VariableRef, how: Compare, value: VariableValue): Check {
    if (variable.owner === 'level') {
        return {
            kind: 'value',
            target: THIS,
            value: { kind: 'variable', name: variable.name },
            compare: how,
            amount: value,
        };
    }

    const own = { kind: 'variable', name: variable.name, own: true } as const;
    return { kind: 'value', target: variable.target, value: own, compare: how, amount: value };
}

function variablesOf(entity: Entity) {
    const variables = entity.getComponent(VariablesComponent)?.get('variables') ?? [];

    return Object.fromEntries(variables.map((variable) => [variable.name, variable.value]));
}

// Plays the level headless and lists every firing that ran, the variables of `watched` after each tick (the
// World's first) and the warnings at the end.
function play(level: Level, ticks: number, watched: readonly Entity[] = []) {
    const heard: HeardFiring[] = [];
    const after: Record<string, VariableValue>[][] = [];
    let warnings: Simulation['warnings'] = [];
    let currentTick = 0;

    const inputsAt = (tick: number) => {
        currentTick = tick;
        return NOTHING;
    };
    const afterTick = (simulation: Simulation) => {
        for (const firing of simulation.firings) {
            heard.push({ tick: currentTick, owner: firing.owner.id, kind: firing.when.kind });
        }
        const entities = [
            simulation.level.world,
            ...watched.map((entity) => simulation.level.requireEntity(entity.id)),
        ];
        after.push(entities.map(variablesOf));
        warnings = simulation.warnings;
    };

    const levelData = new LevelWriter().write(level);
    const outcome = runHeadless(levelData, new ScriptedEngine(), { ticks, start: START, inputsAt, afterTick });
    if (!outcome.ok) throw new Error(`The level was refused: ${JSON.stringify(outcome.refusal)}`);

    return { heard, after, warnings };
}

describe('Change value on every type of variable', () => {
    test("an entity's own number, string and boolean are set, added to and flipped", () => {
        const level = levelWith({});
        const door = place(level, level.world, transform(0, 0));
        giveVariables(door, { hits: 3, label: 'shut', open: false, lamp: true });
        giveTriggers(door, [
            {
                when: LEVEL_START,
                actions: [
                    changeOwn(THIS, 'hits', 'subtract', 1),
                    changeOwn(THIS, 'label', 'set', 'open'),
                    changeOwn(THIS, 'open', 'flip', null),
                    changeOwn(THIS, 'lamp', 'flip', true),
                    changeOwn(THIS, 'lamp', 'flip', null),
                ],
            },
        ]);
        // Skipped in play: a string is only set, and a boolean's amount must be a boolean. A tag target is only
        // known in play, so triggerProblems doesn't stop the trigger.
        door.addComponent(new TagsComponent({ tags: ['door'] }));
        const doors: Target = { kind: 'tagged', tag: 'door' };
        giveTriggers(level.world, [
            {
                when: LEVEL_START,
                actions: [changeOwn(doors, 'label', 'add', 1), changeOwn(doors, 'open', 'set', 'yes')],
            },
        ]);

        const { after } = play(level, 1, [door]);

        expect(after[0]?.[1]).toEqual({ hits: 2, label: 'open', open: true, lamp: true });
    });

    test("the level's string and boolean are set and flipped on the World", () => {
        const level = levelWith({ name: 'Ada', won: false });
        giveTriggers(level.world, [
            { when: LEVEL_START, actions: [changeLevel('name', 'set', 'Bo'), changeLevel('won', 'flip', null)] },
        ]);

        const { after } = play(level, 1);

        expect(after[0]?.[0]).toEqual({ name: 'Bo', won: true });
    });

    test("the report gives an entity's changed own variables, and nothing for unchanged ones", () => {
        const level = levelWith({});
        const door = place(level, level.world, transform(0, 0));
        giveVariables(door, { open: false, label: 'shut' });
        giveTriggers(door, [{ when: LEVEL_START, actions: [changeOwn(THIS, 'open', 'flip', null)] }]);
        const started = startSimulation(new LevelWriter().write(level), new ScriptedEngine(), START);
        if (!started.ok) throw new Error('The level was refused');
        const simulation = started.value;

        simulation.runTick(NOTHING);

        expect(simulation.takeReport().changes).toEqual([
            {
                entity: door.id,
                component: 'VariablesComponent',
                values: {
                    variables: [
                        { name: 'open', value: true },
                        { name: 'label', value: 'shut' },
                    ],
                },
            },
        ]);
    });
});

describe('the variable compare check', () => {
    // Each trigger that passes adds its own power of ten to `score`, so the sum says which passed.
    function scoreOf(checksOf: (level: Level) => readonly Check[]) {
        const level = levelWith({ score: 0, name: 'Ada', won: false });
        const checks = checksOf(level);
        giveTriggers(
            level.world,
            checks.map((check, i) => ({
                when: LEVEL_START,
                checks: [check],
                actions: [changeLevel('score', 'add', POWERS_OF_TEN[i] ?? 0)],
            })),
        );

        return play(level, 1).after[0]?.[0]?.['score'];
    }

    test("compares the level's string and boolean with is and is not", () => {
        const score = scoreOf(() => [
            compare(LEVEL('name'), 'is', 'Ada'),
            compare(LEVEL('name'), 'isNot', 'Ada'),
            compare(LEVEL('won'), 'is', false),
            compare(LEVEL('won'), 'isNot', false),
            compare(LEVEL('name'), 'isNot', 'Bo'),
            // Values of another type, or a comparison a string doesn't have, never pass.
            compare(LEVEL('won'), 'isNot', 'false'),
            compare(LEVEL('name'), 'more', 'A'),
        ]);

        expect(score).toBe(1 + 100 + 10_000);
    });

    test("reads the target's own variable, any tagged entity passing, and one without it failing", () => {
        const score = scoreOf((level) => {
            const door = place(level, level.world, transform(0, 0));
            giveVariables(door, { open: true });
            for (const hp of [3, 1]) {
                const enemy = place(level, level.world, transform(hp, 0));
                giveVariables(enemy, { hp });
                enemy.addComponent(new TagsComponent({ tags: ['enemy'] }));
            }
            const theDoor: Target = { kind: 'entity', entity: door.id };
            const enemies: Target = { kind: 'tagged', tag: 'enemy' };

            return [
                compare(OWN('open', theDoor), 'is', true),
                compare(OWN('hp', enemies), 'atMost', 1),
                compare(OWN('hp', enemies), 'more', 5),
                // The World's variables aren't the door's.
                compare(OWN('score', theDoor), 'is', 0),
                compare(OWN('missing', theDoor), 'isNot', true),
            ];
        });

        expect(score).toBe(1 + 10);
    });
});

describe('a variable changes', () => {
    test('without a condition it fires on every change of value, in the same tick, and not on the same value', () => {
        const level = levelWith({ coins: 0 });
        const door = place(level, level.world, transform(0, 0));
        giveVariables(door, { seen: 0 });
        giveTriggers(door, [{ when: changes(LEVEL('coins')), actions: [changeOwn(THIS, 'seen', 'add', 1)] }]);
        giveTriggers(level.world, [
            {
                when: LEVEL_START,
                actions: [
                    changeLevel('coins', 'set', 5),
                    changeLevel('coins', 'set', 5),
                    changeLevel('coins', 'add', 0),
                    changeLevel('coins', 'subtract', 2),
                ],
            },
        ]);

        const { heard, after } = play(level, 2, [door]);

        expect(heard).toEqual([
            { tick: 1, owner: 1, kind: 'levelStart' },
            { tick: 1, owner: door.id, kind: 'variableChanged' },
            { tick: 1, owner: door.id, kind: 'variableChanged' },
        ]);
        expect(after.map((state) => state[1]?.['seen'])).toEqual([2, 2]);
    });

    test('"becomes" fires only when its condition turns true: 9, 10, 11 fires once, and again after it fell', () => {
        const level = levelWith({ coins: 8, wins: 0 });
        giveTriggers(level.world, [
            {
                when: LEVEL_START,
                actions: [
                    changeLevel('coins', 'add', 1),
                    changeLevel('coins', 'add', 1),
                    changeLevel('coins', 'add', 1),
                    changeLevel('coins', 'subtract', 5),
                    changeLevel('coins', 'add', 4),
                    changeLevel('coins', 'add', 1),
                ],
            },
            {
                when: changes(LEVEL('coins'), { compare: 'atLeast', value: 10 }),
                actions: [changeLevel('wins', 'add', 1)],
            },
        ]);

        const { after } = play(level, 1);

        expect(after[0]?.[0]).toEqual({ coins: 11, wins: 2 });
    });

    test('"becomes" on a string and a boolean, with is and is not', () => {
        const level = levelWith({ mood: 'calm', lamp: false, heard: 0 });
        const addHeard = (amount: number) => [changeLevel('heard', 'add', amount)];
        giveTriggers(level.world, [
            {
                when: LEVEL_START,
                actions: [
                    changeLevel('mood', 'set', 'angry'),
                    changeLevel('mood', 'set', 'sad'),
                    changeLevel('lamp', 'flip', null),
                ],
            },
            { when: changes(LEVEL('mood'), { compare: 'is', value: 'angry' }), actions: addHeard(1) },
            // Already true at the start, so changing from calm to angry to sad never turns it true.
            { when: changes(LEVEL('mood'), { compare: 'isNot', value: 'happy' }), actions: addHeard(10) },
            { when: changes(LEVEL('lamp'), { compare: 'is', value: true }), actions: addHeard(100) },
            { when: changes(LEVEL('lamp'), { compare: 'isNot', value: true }), actions: addHeard(1000) },
        ]);

        const { after } = play(level, 1);

        expect(after[0]?.[0]?.['heard']).toBe(101);
    });

    test("the level's variables are heard by every entity, an entity's own only by itself", () => {
        const level = levelWith({ coins: 0 });
        const [first, second] = [0, 100].map((x) => {
            const enemy = place(level, level.world, transform(x, 0));
            giveVariables(enemy, { hp: 3 });
            giveTriggers(enemy, [{ when: changes(OWN('hp')) }, { when: changes(LEVEL('coins')) }]);

            return enemy;
        });
        if (first === undefined || second === undefined) throw new Error('No enemies');
        giveTriggers(level.world, [
            // A World trigger naming the World's own variable hears it as the level's.
            { when: changes(OWN('coins')) },
            {
                when: LEVEL_START,
                actions: [
                    changeOwn({ kind: 'entity', entity: first.id }, 'hp', 'subtract', 1),
                    changeLevel('coins', 'add', 1),
                ],
            },
        ]);

        const { heard } = play(level, 1);

        expect(heard).toEqual([
            { tick: 1, owner: 1, kind: 'levelStart' },
            { tick: 1, owner: first.id, kind: 'variableChanged' },
            { tick: 1, owner: 1, kind: 'variableChanged' },
            { tick: 1, owner: first.id, kind: 'variableChanged' },
            { tick: 1, owner: second.id, kind: 'variableChanged' },
        ]);
    });

    test('a change hearing itself stops after 32 steps in the tick, with one warning', () => {
        const level = levelWith({ coins: 0 });
        giveTriggers(level.world, [
            { when: LEVEL_START, actions: [changeLevel('coins', 'add', 1)] },
            { when: changes(LEVEL('coins')), actions: [changeLevel('coins', 'add', 1)] },
        ]);

        const { heard, after, warnings } = play(level, 2);

        expect(heard.filter((firing) => firing.kind === 'variableChanged')).toHaveLength(31);
        expect(after.map((state) => state[0]?.['coins'])).toEqual([32, 32]);
        expect(warnings).toEqual([{ kind: 'chainLimit' }]);
    });
});
