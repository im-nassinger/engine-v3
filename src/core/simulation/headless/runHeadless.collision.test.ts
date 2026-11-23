import { describe, expect, test } from 'vitest';

import { ShapeComponent, SurfaceComponent, TriggerComponent } from '../../components/index.ts';
import type { EntityId, Trigger, When } from '../../fields/index.ts';
import { LevelWriter } from '../../level-data/index.ts';
import { Level } from '../../level/index.ts';
import type { Entity } from '../../level/index.ts';
import type { ContactEvent, SensorEvent } from '../../physics/index.ts';

import { runHeadless } from './runHeadless.ts';
import type { Simulation } from '../run/Simulation.ts';
import { ScriptedEngine } from '../testing/ScriptedPhysics.ts';
import { place, placeBody, transform } from '../testing/scriptedLevel.ts';

const START = { clockTimeMs: 0 };

type HeardFiring = {
    readonly tick: number;
    readonly owner: EntityId;
    readonly kind: When['kind'];
    readonly other: EntityId | null;
};

function giveTriggers(entity: Entity, whens: readonly When[]) {
    const triggers: Trigger[] = whens.map((when, i) => ({
        id: i + 1,
        name: null,
        on: true,
        when,
        checks: [],
        actions: [],
        repeat: { kind: 'everyTime' },
    }));

    entity.addComponent(new TriggerComponent({ triggers, nextTriggerId: triggers.length + 1 }));
}

function hearsCollision(entity: Entity) {
    giveTriggers(entity, [{ kind: 'collision' }]);
}

function placeStatic(level: Level, parent: Entity, x: number) {
    return placeBody(level, parent, transform(x, 0), 'static');
}

// A 10 px square shape with a surface and no body of its own, so it goes to the body above it, or to the
// ground.
function placeSurface(level: Level, parent: Entity, x: number) {
    const entity = place(level, parent, transform(x, 0));
    entity.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width: 10, height: 10 } }));
    entity.addComponent(new SurfaceComponent());

    return entity;
}

// One side of a contact: the surface's entity and the entity of the body it is on.
type Side = { readonly surface: Entity; readonly body: Entity };

function side(surface: Entity, body = surface): Side {
    return { surface, body };
}

function contact(kind: ContactEvent['kind'], a: Side, b: Side): ContactEvent {
    return { kind, surfaceA: a.surface.id, bodyA: a.body.id, surfaceB: b.surface.id, bodyB: b.body.id };
}

const begins = (a: Side, b: Side) => contact('begin', a, b);
const ends = (a: Side, b: Side) => contact('end', a, b);

type PlayOptions = {
    readonly ticks: number;
    readonly contactsAt?: Record<number, readonly ContactEvent[]>;
    readonly sensorEventsAt?: Record<number, readonly SensorEvent[]>;
};

// Plays the level headless on a ScriptedWorld, queueing each tick's events, and lists every firing that ran.
function play(level: Level, options: PlayOptions) {
    const engine = new ScriptedEngine();
    const levelData = new LevelWriter().write(level);
    const heard: HeardFiring[] = [];
    let currentTick = 0;

    const inputsAt = (tick: number) => {
        currentTick = tick;
        engine.world.queueContactEvents(options.contactsAt?.[tick] ?? []);
        engine.world.queueSensorEvents(options.sensorEventsAt?.[tick] ?? []);

        return { heldKeys: [], pressedKeys: [] };
    };
    const afterTick = (simulation: Simulation) => {
        for (const firing of simulation.firings) {
            heard.push({ tick: currentTick, owner: firing.owner.id, kind: firing.when.kind, other: firing.other });
        }
    };

    const outcome = runHeadless(levelData, engine, { ticks: options.ticks, start: START, inputsAt, afterTick });
    if (!outcome.ok) throw new Error(`The level was refused: ${JSON.stringify(outcome.refusal)}`);

    const contactEventSurfaces = [...(engine.settings?.contactEventSurfaces ?? [])];

    return { heard, contactEventSurfaces };
}

describe('collision', () => {
    test("a ball hitting a wall fires the wall's trigger and the ball's, each naming the other", () => {
        const level = Level.createNew();
        const wall = placeStatic(level, level.world, 0);
        hearsCollision(wall);
        const ball = placeBody(level, level.world, transform(100, 0));
        hearsCollision(ball);
        const contactsAt = { 2: [begins(side(ball), side(wall))] };

        const { heard } = play(level, { ticks: 3, contactsAt });

        expect(heard).toEqual([
            { tick: 2, owner: wall.id, kind: 'collision', other: ball.id },
            { tick: 2, owner: ball.id, kind: 'collision', other: wall.id },
        ]);
    });

    test('only the surfaces of entities hearing collisions, or inside a group that does, send contact events', () => {
        const level = Level.createNew();
        const wall = placeStatic(level, level.world, 0);
        hearsCollision(wall);
        placeStatic(level, level.world, 100);
        const group = place(level, level.world, transform(200, 0));
        hearsCollision(group);
        const part = placeStatic(level, group, 0);

        const { contactEventSurfaces } = play(level, { ticks: 1 });

        expect(contactEventSurfaces).toEqual([wall.id, part.id]);
    });

    test('a level with no collision trigger asks for no contact events', () => {
        const level = Level.createNew();
        placeStatic(level, level.world, 0);

        expect(play(level, { ticks: 1 }).contactEventSurfaces).toEqual([]);
    });

    test('a body of two shapes hitting with both fires once, and again only after both have parted', () => {
        const level = Level.createNew();
        const wall = placeStatic(level, level.world, 0);
        hearsCollision(wall);
        const crate = placeBody(level, level.world, transform(100, 0));
        const left = placeSurface(level, crate, -5);
        const right = placeSurface(level, crate, 5);
        const contactsAt = {
            2: [begins(side(left, crate), side(wall)), begins(side(wall), side(right, crate))],
            3: [ends(side(left, crate), side(wall))],
            4: [begins(side(left, crate), side(wall)), ends(side(wall), side(right, crate))],
            5: [ends(side(left, crate), side(wall))],
            7: [begins(side(right, crate), side(wall))],
        };

        const { heard } = play(level, { ticks: 8, contactsAt });

        expect(heard).toEqual([
            { tick: 2, owner: wall.id, kind: 'collision', other: crate.id },
            { tick: 7, owner: wall.id, kind: 'collision', other: crate.id },
        ]);
    });

    test('a hit after the two parted fires again, a hit while still touching does not', () => {
        const level = Level.createNew();
        const wall = placeStatic(level, level.world, 0);
        hearsCollision(wall);
        const ball = placeBody(level, level.world, transform(100, 0));
        const hit = begins(side(ball), side(wall));
        const parted = ends(side(ball), side(wall));
        const contactsAt = { 2: [hit], 3: [parted], 5: [hit], 6: [parted, hit] };

        const { heard } = play(level, { ticks: 7, contactsAt });

        expect(heard.map((firing) => firing.tick)).toEqual([2, 5]);
    });

    test('a group hears hits on its parts, and its parts hitting each other fire nothing', () => {
        const level = Level.createNew();
        const group = place(level, level.world, transform(0, 0));
        hearsCollision(group);
        const part = placeBody(level, group, transform(0, 0));
        const otherPart = placeBody(level, group, transform(30, 0));
        const ball = placeBody(level, level.world, transform(100, 0));
        const contactsAt = {
            2: [begins(side(part), side(otherPart)), begins(side(ball), side(part))],
            3: [begins(side(otherPart), side(ball))],
        };

        const { heard } = play(level, { ticks: 3, contactsAt });

        expect(heard).toEqual([{ tick: 2, owner: group.id, kind: 'collision', other: ball.id }]);
    });

    test('a shape on the ground is hit as itself, not as the World', () => {
        const level = Level.createNew();
        const floor = placeSurface(level, level.world, 0);
        const ball = placeBody(level, level.world, transform(0, -20));
        hearsCollision(ball);
        const contactsAt = { 2: [begins(side(floor, level.world), side(ball))] };

        const { heard } = play(level, { ticks: 2, contactsAt });

        expect(heard).toEqual([{ tick: 2, owner: ball.id, kind: 'collision', other: floor.id }]);
    });

    test('each hitting entity is counted on its own', () => {
        const level = Level.createNew();
        const wall = placeStatic(level, level.world, 0);
        hearsCollision(wall);
        const ball = placeBody(level, level.world, transform(100, 0));
        const crate = placeBody(level, level.world, transform(200, 0));
        const contactsAt = {
            2: [begins(side(ball), side(wall))],
            3: [ends(side(ball), side(wall)), begins(side(crate), side(wall))],
        };

        const { heard } = play(level, { ticks: 3, contactsAt });

        expect(heard.map((firing) => [firing.tick, firing.other])).toEqual([
            [2, ball.id],
            [3, crate.id],
        ]);
    });

    test('collision comes after touched and no longer touched in a tick', () => {
        const level = Level.createNew();
        const wall = placeStatic(level, level.world, 0);
        giveTriggers(wall, [{ kind: 'collision' }, { kind: 'untouched' }, { kind: 'touched' }]);
        const ball = placeBody(level, level.world, transform(100, 0));
        const crate = placeBody(level, level.world, transform(200, 0));
        const sensorTouch = (kind: SensorEvent['kind'], visitor: Entity): SensorEvent => ({
            kind,
            sensor: wall.id,
            visitor: visitor.id,
            visitorBody: visitor.id,
            visitorIsSensor: false,
        });
        const sensorEventsAt = {
            2: [sensorTouch('begin', ball)],
            3: [sensorTouch('end', ball), sensorTouch('begin', crate)],
        };
        const contactsAt = { 3: [begins(side(crate), side(wall))] };

        const { heard } = play(level, { ticks: 3, contactsAt, sensorEventsAt });
        const thirdTick = heard.filter((firing) => firing.tick === 3).map((firing) => firing.kind);

        expect(thirdTick).toEqual(['touched', 'untouched', 'collision']);
    });
});
