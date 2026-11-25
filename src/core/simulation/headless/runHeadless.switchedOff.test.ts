import { describe, expect, test } from 'vitest';

import { ShapeComponent, TriggerComponent, VariablesComponent } from '../../components/index.ts';
import type { Action, EntityId, JsonValue, Target, Trigger, When } from '../../fields/index.ts';
import { LevelWriter } from '../../level-data/index.ts';
import { Level } from '../../level/index.ts';
import type { Entity } from '../../level/index.ts';
import type { SensorEvent } from '../../physics/index.ts';

import { runHeadless } from './runHeadless.ts';
import type { Simulation } from '../run/Simulation.ts';
import { ScriptedEngine } from '../testing/ScriptedPhysics.ts';
import { placeBody, transform } from '../testing/scriptedLevel.ts';

const START = { clockTimeMs: 0 };
const THIS: Target = { kind: 'this' };
// The World is entity 1 in a new level.
const WORLD: Target = { kind: 'entity', entity: 1 };
const TOUCHED: When = { kind: 'touched' };

type TriggerParts = {
    readonly when: When;
    readonly actions: readonly Action[];
};

function giveTriggers(entity: Entity, parts: readonly TriggerParts[]) {
    const triggers: Trigger[] = parts.map((part, i) => ({
        id: i + 1,
        name: null,
        on: true,
        when: part.when,
        checks: [],
        actions: part.actions,
    }));

    entity.addComponent(new TriggerComponent({ triggers, nextTriggerId: triggers.length + 1 }));
}

// A level 1,000 px square whose World counts in the variable `n`.
function countingLevel() {
    const level = Level.createNew();
    level.world.requireComponent(ShapeComponent).set('geometry', { kind: 'rectangle', width: 1000, height: 1000 });
    level.world.addComponent(new VariablesComponent({ variables: [{ name: 'n', value: 0 }] }));

    return level;
}

function placeStatic(level: Level, x: number) {
    return placeBody(level, level.world, transform(x, 0), 'static');
}

function count(): Action {
    return { kind: 'change', target: WORLD, value: { kind: 'variable', name: 'n' }, op: 'add', amount: 1 };
}

function enabled(target: Target, trigger: number, on: boolean): Action {
    return { kind: 'change', target, value: { kind: 'triggerOn', trigger }, op: 'set', amount: on };
}

function wait(seconds: number): Action {
    return { kind: 'wait', seconds };
}

// A trigger that rests: it switches itself off, waits a second, and switches itself on again.
function resting(when: When): TriggerParts {
    return { when, actions: [count(), enabled(THIS, 1, false), wait(1), enabled(THIS, 1, true)] };
}

function touch(kind: SensorEvent['kind'], sensor: Entity, visitor: Entity): SensorEvent {
    return {
        kind,
        sensor: sensor.id,
        sensorBody: sensor.id,
        visitor: visitor.id,
        visitorBody: visitor.id,
        visitorIsSensor: false,
    };
}

type Played = {
    // The World's `n` after each tick; index 0 is tick 1.
    readonly counts: JsonValue[];
    readonly level: Level;
};

// Plays the level headless on a ScriptedWorld, sending each tick's sensor events.
function play(level: Level, ticks: number, sensorEventsAt: Record<number, readonly SensorEvent[]> = {}): Played {
    const engine = new ScriptedEngine();
    const counts: JsonValue[] = [];
    let last: Level | undefined;

    const inputsAt = (tick: number) => {
        engine.world.queueSensorEvents(sensorEventsAt[tick] ?? []);

        return { heldKeys: [], pressedKeys: [] };
    };
    const afterTick = (simulation: Simulation) => {
        const variables = simulation.level.world.getComponent(VariablesComponent)?.get('variables') ?? [];
        counts.push(variables.find((variable) => variable.name === 'n')?.value ?? null);
        last = simulation.level;
    };

    const levelData = new LevelWriter().write(level);
    const outcome = runHeadless(levelData, engine, { ticks, start: START, inputsAt, afterTick });
    if (!outcome.ok || last === undefined) throw new Error('The level was refused');

    return { counts, level: last };
}

function isOn(level: Level, ownerId: EntityId, triggerId: number) {
    const triggers = level.findEntity(ownerId)?.getComponent(TriggerComponent)?.get('triggers') ?? [];

    return triggers.find((trigger) => trigger.id === triggerId)?.on;
}

describe('a switched-off trigger in play', () => {
    test('a resting spike hurts once for two touches in one tick, not during its rest, and again after it', () => {
        const level = countingLevel();
        const spike = placeStatic(level, 0);
        giveTriggers(spike, [resting(TOUCHED)]);
        const ball = placeStatic(level, 100);
        const crate = placeStatic(level, 200);

        const { counts, level: played } = play(level, 100, {
            2: [touch('begin', spike, ball), touch('begin', spike, crate)],
            10: [touch('end', spike, ball)],
            30: [touch('begin', spike, ball)],
            40: [touch('end', spike, ball)],
            80: [touch('begin', spike, ball)],
        });

        expect(counts[1]).toBe(1);
        expect(counts[78]).toBe(1);
        expect(counts[79]).toBe(2);
        expect(isOn(played, spike.id, 1)).toBe(false);
    });

    test('the run that switched its own trigger off goes on after its Wait and switches it on again', () => {
        const level = countingLevel();
        giveTriggers(level.world, [resting({ kind: 'levelStart' })]);

        const { level: played } = play(level, 61);

        expect(isOn(played, level.world.id, 1)).toBe(true);
    });

    test('a once-per-run trigger, switching itself off first, fires once', () => {
        const level = countingLevel();
        giveTriggers(level.world, [
            { when: { kind: 'every', seconds: 0.1 }, actions: [enabled(THIS, 1, false), count()] },
        ]);

        const { counts } = play(level, 120);

        expect(counts.at(-1)).toBe(1);
    });

    test('a trigger switched off by another trigger during its rest stays off', () => {
        const level = countingLevel();
        const door = placeStatic(level, 0);
        giveTriggers(door, [resting({ kind: 'every', seconds: 0.1 })]);
        const doorTarget: Target = { kind: 'entity', entity: door.id };
        giveTriggers(level.world, [
            { when: { kind: 'after', seconds: 0.5 }, actions: [enabled(doorTarget, 1, false)] },
        ]);

        const { counts, level: played } = play(level, 200);

        expect(counts.at(-1)).toBe(1);
        expect(isOn(played, door.id, 1)).toBe(false);
    });

    test('a resumed run due in the tick another trigger switches it off, earlier in that tick, is dropped', () => {
        const level = countingLevel();
        const door = placeStatic(level, 0);
        giveTriggers(door, [{ when: { kind: 'levelStart' }, actions: [wait(1), count()] }]);
        const doorTarget: Target = { kind: 'entity', entity: door.id };
        giveTriggers(level.world, [
            { when: { kind: 'after', seconds: 61 / 60 }, actions: [enabled(doorTarget, 1, false)] },
        ]);

        const { counts } = play(level, 70);

        expect(counts.at(-1)).toBe(0);
    });
});
