import { describe, expect, test } from 'vitest';

import { TagsComponent, TriggerComponent, VariablesComponent } from '../../components/index.ts';
import type { Action, Check, EntityId, Target, Trigger, When } from '../../fields/index.ts';
import { LevelWriter } from '../../level-data/index.ts';
import { Level } from '../../level/index.ts';
import type { Entity } from '../../level/index.ts';
import type { SensorEvent } from '../../physics/index.ts';

import { runHeadless } from './runHeadless.ts';
import type { Simulation } from '../run/Simulation.ts';
import { ScriptedEngine } from '../testing/ScriptedPhysics.ts';
import { place, placeBody, transform } from '../testing/scriptedLevel.ts';

const START = { clockTimeMs: 0 };
const THIS: Target = { kind: 'this' };
const LEVEL_START: When = { kind: 'levelStart' };
const DESTROYED: When = { kind: 'destroyed' };
// The World is entity 1 in a new level.
const WORLD: Target = { kind: 'entity', entity: 1 };

type TriggerParts = {
    readonly when: When;
    readonly checks?: readonly Check[];
    readonly actions?: readonly Action[];
};

type HeardFiring = {
    readonly tick: number;
    readonly owner: EntityId;
    readonly kind: When['kind'];
    readonly other: EntityId | null;
};

function giveTriggers(entity: Entity, parts: readonly TriggerParts[]) {
    const triggers: Trigger[] = parts.map((part, i) => ({
        id: i + 1,
        name: null,
        on: true,
        when: part.when,
        checks: part.checks ?? [],
        actions: part.actions ?? [],
        repeat: { kind: 'everyTime' },
    }));

    entity.addComponent(new TriggerComponent({ triggers, nextTriggerId: triggers.length + 1 }));
}

function giveTags(entity: Entity, tags: readonly string[]) {
    entity.addComponent(new TagsComponent({ tags }));
}

function levelWithCoins() {
    const level = Level.createNew();
    level.world.addComponent(new VariablesComponent({ variables: [{ name: 'coins', value: 0 }] }));

    return level;
}

const addCoin: Action = {
    kind: 'change',
    target: WORLD,
    value: { kind: 'variable', name: 'coins' },
    op: 'add',
    amount: 1,
};

function destroy(target: Target): Action {
    return { kind: 'destroy', target };
}

function fire(target: Target, name: string): Action {
    return { kind: 'fire', target, name, amount: null };
}

function custom(name: string): When {
    return { kind: 'custom', name };
}

type PlayOptions = {
    readonly ticks: number;
    readonly sensorEventsAt?: Record<number, readonly SensorEvent[]>;
};

type TickState = {
    readonly coins: unknown;
    readonly present: readonly EntityId[];
};

// Plays the level headless on a ScriptedWorld and lists every firing that ran, the coins after each tick
// and the warnings at the end. `watched` are the entities whose presence after each tick is recorded.
function play(level: Level, options: PlayOptions, watched: readonly Entity[] = []) {
    const engine = new ScriptedEngine();
    const heard: HeardFiring[] = [];
    const after: TickState[] = [];
    let warnings: Simulation['warnings'] = [];
    let currentTick = 0;

    const inputsAt = (tick: number) => {
        currentTick = tick;
        engine.world.queueSensorEvents(options.sensorEventsAt?.[tick] ?? []);

        return { heldKeys: [], pressedKeys: [] };
    };
    const afterTick = (simulation: Simulation) => {
        for (const firing of simulation.firings) {
            heard.push({ tick: currentTick, owner: firing.owner.id, kind: firing.when.kind, other: firing.other });
        }
        const variables = simulation.level.world.getComponent(VariablesComponent)?.get('variables') ?? [];
        const coins = variables.find((variable) => variable.name === 'coins')?.value;
        const present = watched.filter((entity) => simulation.level.findEntity(entity.id) !== undefined);
        after.push({ coins, present: present.map((entity) => entity.id) });
        warnings = simulation.warnings;
    };

    const levelData = new LevelWriter().write(level);
    const outcome = runHeadless(levelData, engine, { ticks: options.ticks, start: START, inputsAt, afterTick });
    if (!outcome.ok) throw new Error(`The level was refused: ${JSON.stringify(outcome.refusal)}`);

    return { heard, after, warnings };
}

describe('Destroyed', () => {
    test('every entity in a destroyed group hears its own Destroyed once, parents first, in the same tick', () => {
        const level = Level.createNew();
        const group = place(level, level.world, transform(0, 0));
        const top = place(level, group, transform(0, 0));
        const lower = place(level, group, transform(10, 0));
        const inner = place(level, lower, transform(0, 0));
        const outside = place(level, level.world, transform(50, 0));
        for (const entity of [group, top, lower, inner, outside]) {
            giveTriggers(entity, [{ when: DESTROYED }]);
        }
        // The second Destroy finds `lower` already marked, so it hears nothing twice.
        giveTriggers(level.world, [
            {
                when: LEVEL_START,
                actions: [destroy({ kind: 'entity', entity: group.id }), destroy({ kind: 'entity', entity: lower.id })],
            },
        ]);

        const { heard, after } = play(level, { ticks: 2 }, [group, top, lower, inner, outside]);
        const destroyed = heard.filter((firing) => firing.kind === 'destroyed');

        expect(destroyed).toEqual([
            { tick: 1, owner: group.id, kind: 'destroyed', other: null },
            { tick: 1, owner: top.id, kind: 'destroyed', other: null },
            { tick: 1, owner: lower.id, kind: 'destroyed', other: null },
            { tick: 1, owner: inner.id, kind: 'destroyed', other: null },
        ]);
        expect(after[0]?.present).toEqual([outside.id]);
    });

    test('a Destroyed trigger reads its entity, still there, and changes a variable', () => {
        const level = levelWithCoins();
        const coin = placeBody(level, level.world, transform(0, 0), 'static');
        giveTags(coin, ['coin']);
        const isCoin: Check = { kind: 'hasTag', target: THIS, tag: 'coin' };
        giveTriggers(coin, [
            { when: LEVEL_START, actions: [destroy(THIS)] },
            { when: DESTROYED, checks: [isCoin], actions: [addCoin] },
        ]);

        const { after } = play(level, { ticks: 2 }, [coin]);

        expect(after).toEqual([
            { coins: 1, present: [] },
            { coins: 1, present: [] },
        ]);
    });
});

describe('custom events', () => {
    test('a button fires `open` on every tagged door, each hearing it in the same tick from the button', () => {
        const level = levelWithCoins();
        const button = placeBody(level, level.world, transform(0, 0), 'static');
        giveTriggers(button, [{ when: { kind: 'touched' }, actions: [fire({ kind: 'tagged', tag: 'door' }, 'open')] }]);
        const doors = [100, 200].map((x) => {
            const door = place(level, level.world, transform(x, 0));
            giveTags(door, ['door']);
            giveTriggers(door, [{ when: custom('shut') }, { when: custom('open'), actions: [addCoin] }]);

            return door;
        });
        const wall = place(level, level.world, transform(300, 0));
        giveTriggers(wall, [{ when: custom('open'), actions: [addCoin] }]);
        const ball = placeBody(level, level.world, transform(0, -20));
        const touch: SensorEvent = {
            kind: 'begin',
            sensor: button.id,
            visitor: ball.id,
            visitorBody: ball.id,
            visitorIsSensor: false,
        };

        const { heard, after } = play(level, { ticks: 3, sensorEventsAt: { 2: [touch] } });

        expect(heard).toEqual([
            { tick: 2, owner: button.id, kind: 'touched', other: ball.id },
            { tick: 2, owner: doors[0]?.id, kind: 'custom', other: button.id },
            { tick: 2, owner: doors[1]?.id, kind: 'custom', other: button.id },
        ]);
        expect(after.map((state) => state.coins)).toEqual([0, 2, 2]);
    });

    test('a name nobody hears is ignored without a warning', () => {
        const level = levelWithCoins();
        const door = place(level, level.world, transform(100, 0));
        giveTriggers(door, [{ when: custom('open'), actions: [addCoin] }]);
        giveTriggers(level.world, [
            { when: LEVEL_START, actions: [fire({ kind: 'entity', entity: door.id }, 'knock'), addCoin] },
        ]);

        const { heard, after, warnings } = play(level, { ticks: 2 });

        expect(heard.map((firing) => firing.kind)).toEqual(['levelStart']);
        expect(after.map((state) => state.coins)).toEqual([1, 1]);
        expect(warnings).toEqual([]);
    });

    test('an event firing itself stops after 32 steps in the tick, with one warning, and is not heard later', () => {
        const level = levelWithCoins();
        const bell = place(level, level.world, transform(0, 0));
        giveTriggers(bell, [
            { when: LEVEL_START, actions: [fire(THIS, 'ring')] },
            { when: custom('ring'), actions: [addCoin, fire(THIS, 'ring')] },
        ]);

        const { heard, after, warnings } = play(level, { ticks: 2 });

        // Level start is the first step, so `ring` is heard in the other 31.
        expect(heard.filter((firing) => firing.kind === 'custom')).toHaveLength(31);
        expect(heard.every((firing) => firing.tick === 1)).toBe(true);
        expect(after.map((state) => state.coins)).toEqual([31, 31]);
        expect(warnings).toEqual([{ kind: 'chainLimit' }]);
    });
});
