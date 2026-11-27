import { describe, expect, test } from 'vitest';

import { ShapeComponent, TriggerComponent } from '../../components/index.ts';
import type { EntityId, Trigger, When } from '../../fields/index.ts';
import { LevelWriter } from '../../level-data/index.ts';
import { Level } from '../../level/index.ts';
import type { Entity } from '../../level/index.ts';
import type { KeyCode } from '../../keys/index.ts';
import type { SensorEvent } from '../../physics/index.ts';

import { runHeadless } from './runHeadless.ts';
import type { TickInputs } from '../inputs/TickInputs.ts';
import type { Simulation } from '../run/Simulation.ts';
import { ScriptedEngine } from '../testing/ScriptedPhysics.ts';
import { place, placeBody, transform } from '../testing/scriptedLevel.ts';

const START = { clockTimeMs: 0 };
const NOTHING_HELD: TickInputs = { heldKeys: [], pressedKeys: [] };
const SPACE = 'Space' as KeyCode;

type TriggerSetup = {
    readonly when: When;
    readonly on?: boolean;
};

// A firing as a test reads it: the tick, the owner's id, the trigger's id, its When's kind and `other`.
type HeardFiring = {
    readonly tick: number;
    readonly owner: EntityId;
    readonly trigger: number;
    readonly kind: When['kind'];
    readonly other: EntityId | null;
};

function giveTriggers(entity: Entity, setups: readonly TriggerSetup[]) {
    const triggers: Trigger[] = setups.map((setup, i) => ({
        id: i + 1,
        name: null,
        on: setup.on ?? true,
        when: setup.when,
        checks: [],
        actions: [],
    }));
    const nextTriggerId = triggers.length + 1;

    entity.addComponent(new TriggerComponent({ triggers, nextTriggerId }));
}

// A level 1,000 px square, so a Dynamic 20 px square at y 490 falls fully out of it on the third tick.
function smallLevel() {
    const level = Level.createNew();
    level.world.requireComponent(ShapeComponent).set('geometry', { kind: 'rectangle', width: 1000, height: 1000 });

    return level;
}

function placeStatic(level: Level, parent: Entity, x: number) {
    return placeBody(level, parent, transform(x, 0), 'static');
}

type PlayOptions = {
    readonly ticks: number;
    // The sensor events the step of each tick sends, by its number from 1.
    readonly sensorEventsAt?: (tick: number) => readonly SensorEvent[];
    readonly inputsAt?: (tick: number) => TickInputs;
};

// Plays the level headless on a ScriptedWorld and lists every firing that ran, tick by tick.
function play(level: Level, options: PlayOptions) {
    const engine = new ScriptedEngine();
    const levelData = new LevelWriter().write(level);
    const heard: HeardFiring[] = [];
    let currentTick = 0;

    const inputsAt = (tick: number) => {
        currentTick = tick;
        const events = options.sensorEventsAt?.(tick) ?? [];
        engine.world.queueSensorEvents(events);

        return options.inputsAt?.(tick) ?? NOTHING_HELD;
    };
    const afterTick = (simulation: Simulation) => {
        for (const firing of simulation.firings) {
            heard.push({
                tick: currentTick,
                owner: firing.owner.id,
                trigger: firing.triggerId,
                kind: firing.when.kind,
                other: firing.other,
            });
        }
    };

    const outcome = runHeadless(levelData, engine, { ticks: options.ticks, start: START, inputsAt, afterTick });
    if (!outcome.ok) throw new Error(`The level was refused: ${JSON.stringify(outcome.refusal)}`);

    return heard;
}

function begin(sensor: Entity, visitor: Entity, visitorBody = visitor): SensorEvent {
    return {
        kind: 'begin',
        sensor: sensor.id,
        sensorBody: sensor.id,
        visitor: visitor.id,
        visitorBody: visitorBody.id,
        visitorIsSensor: false,
    };
}

function end(sensor: Entity, visitor: Entity, visitorBody = visitor): SensorEvent {
    return { ...begin(sensor, visitor, visitorBody), kind: 'end' };
}

function atTick(wanted: Record<number, readonly SensorEvent[]>) {
    return (tick: number) => wanted[tick] ?? [];
}

function ticksOf(heard: readonly HeardFiring[]) {
    return heard.map((firing) => firing.tick);
}

describe('level start', () => {
    test('fires on the first tick only', () => {
        const level = smallLevel();
        giveTriggers(level.world, [{ when: { kind: 'levelStart' } }]);

        const heard = play(level, { ticks: 3 });

        expect(heard).toEqual([{ tick: 1, owner: level.world.id, trigger: 1, kind: 'levelStart', other: null }]);
    });

    test('a trigger switched off hears nothing', () => {
        const level = smallLevel();
        giveTriggers(level.world, [{ when: { kind: 'levelStart' }, on: false }]);

        expect(play(level, { ticks: 2 })).toEqual([]);
    });
});

describe('keys and inputs', () => {
    test('a key fires on press, on release, or while held', () => {
        const level = smallLevel();
        giveTriggers(level.world, [
            { when: { kind: 'key', key: SPACE, how: 'pressed' } },
            { when: { kind: 'key', key: SPACE, how: 'released' } },
            { when: { kind: 'key', key: SPACE, how: 'held' } },
        ]);
        const inputsAt = (tick: number): TickInputs => {
            if (tick === 2) return { heldKeys: ['Space'], pressedKeys: ['Space'] };
            if (tick === 3) return { heldKeys: ['Space'], pressedKeys: [] };

            return NOTHING_HELD;
        };

        const heard = play(level, { ticks: 5, inputsAt });
        const firedTicks = heard.map((firing) => [firing.tick, firing.trigger]);

        expect(firedTicks).toEqual([
            [2, 1],
            [2, 3],
            [3, 3],
            [4, 2],
        ]);
    });

    test('an input fires when one of its keys is pressed, a When with no key or input set hears nothing', () => {
        const level = smallLevel();
        giveTriggers(level.world, [
            { when: { kind: 'input', input: 'jump', how: 'pressed' } },
            { when: { kind: 'input', input: null, how: 'pressed' } },
            { when: { kind: 'key', key: null, how: 'held' } },
        ]);
        const inputsAt = (tick: number): TickInputs => {
            if (tick === 2) return { heldKeys: [], pressedKeys: ['Space'] };

            return NOTHING_HELD;
        };

        const heard = play(level, { ticks: 3, inputsAt });

        expect(heard).toEqual([{ tick: 2, owner: level.world.id, trigger: 1, kind: 'input', other: null }]);
    });
});

describe('timers', () => {
    test('"after" fires once, "every" again and again, both in whole ticks from the run start', () => {
        const level = smallLevel();
        giveTriggers(level.world, [
            { when: { kind: 'after', time: 0.05, unit: 'seconds' } },
            { when: { kind: 'every', time: 0.05, unit: 'seconds' } },
        ]);

        const heard = play(level, { ticks: 10 });
        const firedTicks = heard.map((firing) => [firing.tick, firing.trigger]);

        expect(firedTicks).toEqual([
            [3, 1],
            [3, 2],
            [6, 2],
            [9, 2],
        ]);
    });

    test('a time in ticks counts the ticks themselves: every 1 tick fires on each one', () => {
        const level = smallLevel();
        giveTriggers(level.world, [
            { when: { kind: 'every', time: 1, unit: 'ticks' } },
            { when: { kind: 'after', time: 4, unit: 'ticks' } },
        ]);

        const heard = play(level, { ticks: 5 });
        const firedTicks = heard.map((firing) => [firing.tick, firing.trigger]);

        expect(firedTicks).toEqual([
            [1, 1],
            [2, 1],
            [3, 1],
            [4, 1],
            [4, 2],
            [5, 1],
        ]);
    });

    test('a time of 0 s is due on the first tick, and a timer that is off never counts', () => {
        const level = smallLevel();
        giveTriggers(level.world, [
            { when: { kind: 'after', time: 0, unit: 'seconds' } },
            { when: { kind: 'every', time: 0.05, unit: 'seconds' }, on: false },
        ]);

        const heard = play(level, { ticks: 6 });

        expect(heard).toEqual([{ tick: 1, owner: level.world.id, trigger: 1, kind: 'after', other: null }]);
    });
});

describe('touched and no longer touched', () => {
    function coinLevel() {
        const level = smallLevel();
        const coin = placeStatic(level, level.world, 0);
        giveTriggers(coin, [{ when: { kind: 'touched' } }, { when: { kind: 'untouched' } }]);
        const ball = placeStatic(level, level.world, 100);
        const crate = placeStatic(level, level.world, 200);

        return { level, coin, ball, crate };
    }

    test('fires once when an entity starts touching and once when it stops, naming it as `other`', () => {
        const { level, coin, ball } = coinLevel();
        const sensorEventsAt = atTick({ 2: [begin(coin, ball)], 4: [end(coin, ball)] });

        const heard = play(level, { ticks: 5, sensorEventsAt });

        expect(heard).toEqual([
            { tick: 2, owner: coin.id, trigger: 1, kind: 'touched', other: ball.id },
            { tick: 4, owner: coin.id, trigger: 2, kind: 'untouched', other: ball.id },
        ]);
    });

    test('an entity of several shapes touches once, and sliding from one shape to the next fires nothing', () => {
        const { level, coin, ball } = coinLevel();
        const left = place(level, ball, transform(-5, 0));
        const right = place(level, ball, transform(5, 0));
        const sensorEventsAt = atTick({
            2: [begin(coin, left, ball), begin(coin, right, ball)],
            3: [end(coin, left, ball)],
            4: [end(coin, right, ball), begin(coin, left, ball)],
            5: [end(coin, left, ball)],
        });

        const heard = play(level, { ticks: 6, sensorEventsAt });
        const firedTicks = heard.map((firing) => [firing.tick, firing.kind]);

        expect(firedTicks).toEqual([
            [2, 'touched'],
            [5, 'untouched'],
        ]);
    });

    test('several entities touching at once are each their own firing, by their ids', () => {
        const { level, coin, ball, crate } = coinLevel();
        const sensorEventsAt = atTick({ 2: [begin(coin, crate), begin(coin, ball)] });

        const heard = play(level, { ticks: 2, sensorEventsAt });

        expect(heard.map((firing) => firing.other)).toEqual([ball.id, crate.id]);
    });

    test('a visitor that is a sensor too is never noticed', () => {
        const { level, coin, ball } = coinLevel();
        const sensorTouch = { ...begin(coin, ball), visitorIsSensor: true };
        const sensorEventsAt = atTick({ 2: [sensorTouch] });

        expect(play(level, { ticks: 3, sensorEventsAt })).toEqual([]);
    });

    test("a group hears touches on its parts, and its own parts never set off the group's trigger", () => {
        const level = smallLevel();
        const group = place(level, level.world, transform(0, 0));
        giveTriggers(group, [{ when: { kind: 'touched' } }]);
        const part = placeStatic(level, group, 0);
        const otherPart = placeStatic(level, group, 30);
        const ball = placeStatic(level, level.world, 100);
        const sensorEventsAt = atTick({ 2: [begin(part, otherPart), begin(part, ball)] });

        const heard = play(level, { ticks: 2, sensorEventsAt });

        expect(heard).toEqual([{ tick: 2, owner: group.id, trigger: 1, kind: 'touched', other: ball.id }]);
    });

    test("the level's Walls, the World's own lines, touch as the World", () => {
        const { level, coin } = coinLevel();
        const sensorEventsAt = atTick({ 2: [begin(coin, level.world)] });

        const heard = play(level, { ticks: 2, sensorEventsAt });

        expect(heard.map((firing) => firing.other)).toEqual([level.world.id]);
    });

    test('touches come in Entities viewer order of their owners, a group before its part', () => {
        const level = smallLevel();
        const group = place(level, level.world, transform(0, 0));
        giveTriggers(group, [{ when: { kind: 'touched' } }]);
        const part = placeStatic(level, group, 0);
        giveTriggers(part, [{ when: { kind: 'touched' } }]);
        const first = placeStatic(level, level.world, 50);
        giveTriggers(first, [{ when: { kind: 'touched' } }]);
        const ball = placeStatic(level, level.world, 100);
        const sensorEventsAt = atTick({ 2: [begin(first, ball), begin(part, ball)] });

        const heard = play(level, { ticks: 2, sensorEventsAt });

        expect(heard.map((firing) => firing.owner)).toEqual([group.id, part.id, first.id]);
    });
});

describe('the order of a tick', () => {
    test('level start, keys and inputs, timers, then starts touching and stops touching', () => {
        const level = smallLevel();
        giveTriggers(level.world, [
            { when: { kind: 'every', time: 1 / 60, unit: 'seconds' } },
            { when: { kind: 'key', key: SPACE, how: 'held' } },
            { when: { kind: 'levelStart' } },
        ]);
        const sensor = placeStatic(level, level.world, 0);
        giveTriggers(sensor, [{ when: { kind: 'untouched' } }, { when: { kind: 'touched' } }]);
        const ball = placeStatic(level, level.world, 100);
        const crate = placeStatic(level, level.world, 200);
        const sensorEventsAt = atTick({ 1: [begin(sensor, ball)], 4: [end(sensor, ball), begin(sensor, crate)] });
        const holdSpace = () => ({ heldKeys: ['Space'], pressedKeys: [] });

        const heard = play(level, { ticks: 4, sensorEventsAt, inputsAt: holdSpace });
        const firstTick = heard.filter((firing) => firing.tick === 1).map((firing) => firing.kind);
        const fourthTick = heard.filter((firing) => firing.tick === 4).map((firing) => firing.kind);

        expect(firstTick).toEqual(['levelStart', 'key', 'every', 'touched']);
        expect(fourthTick).toEqual(['key', 'every', 'touched', 'untouched']);
    });
});

describe('every time', () => {
    test('a trigger fires every time it hears its event, two touches in one tick too', () => {
        const level = smallLevel();
        const spike = placeStatic(level, level.world, 0);
        giveTriggers(spike, [{ when: { kind: 'touched' } }]);
        giveTriggers(level.world, [{ when: { kind: 'key', key: SPACE, how: 'held' } }]);
        const ball = placeStatic(level, level.world, 100);
        const crate = placeStatic(level, level.world, 200);
        const sensorEventsAt = atTick({ 2: [begin(spike, ball), begin(spike, crate)] });
        const holdSpace = () => ({ heldKeys: ['Space'], pressedKeys: [] });

        const heard = play(level, { ticks: 3, sensorEventsAt, inputsAt: holdSpace });

        expect(ticksOf(heard.filter((firing) => firing.kind === 'key'))).toEqual([1, 2, 3]);
        expect(heard.filter((firing) => firing.kind === 'touched').map((firing) => firing.other)).toEqual([
            ball.id,
            crate.id,
        ]);
    });
});
