import { beforeAll, describe, expect, test } from 'vitest';

import type { EntityId } from '../../core/fields/index.ts';
import type { ContactEvent, PhysicsWorld, SurfacePiece } from '../../core/physics/index.ts';

import { Box2dPhysicsEngine } from './Box2dPhysicsEngine.ts';
import { EARTH_GRAVITY, NO_GRAVITY, bodyDefinition, boxPiece, surfaceDefinition } from './testing/worldTesting.ts';

const GROUND_BODY = 1;
const GROUND = 2;
const BOX_BODY = 3;
const BOX = 4;
const FAR_AWAY = { x: 0, y: -2000, angle: 0 };

const engine = new Box2dPhysicsEngine();

beforeAll(async () => {
    await engine.load();
});

function worldWith(contactEventSurfaces: readonly EntityId[], gravity = EARTH_GRAVITY) {
    return engine.createWorld({ gravity, contactEventSurfaces: new Set(contactEventSurfaces) });
}

// A Static 2,000 × 40 px floor at y = 200, its surface on an entity of its own.
function addGround(world: PhysicsWorld, sensor = false) {
    const body = world.createBody(bodyDefinition({ entity: GROUND_BODY, type: 'static', position: { x: 0, y: 200 } }));
    world.addSurface(body, surfaceDefinition({ entity: GROUND, pieces: [boxPiece(2000, 40)], sensor }));

    return body;
}

// A Dynamic 20 px box at y = 150, whose surface is on a child entity, 20 px above the floor.
function addBox(world: PhysicsWorld, pieces: readonly SurfacePiece[] = [boxPiece(20, 20)]) {
    const body = world.createBody(bodyDefinition({ entity: BOX_BODY, position: { x: 0, y: 150 } }));
    world.addSurface(body, surfaceDefinition({ entity: BOX, pieces }));

    return body;
}

// A width × height box whose centre is at x in its body's space.
function boxPieceAt(x: number, width: number, height: number): SurfacePiece {
    const points = boxPiece(width, height).points.map((point) => ({ x: point.x + x, y: point.y }));

    return { kind: 'polygon', points };
}

// Steps and returns, for each step with a contact event, the step (from 1) and its events.
function stepAndRecord(world: PhysicsWorld, steps: number) {
    const seen: { step: number; events: readonly ContactEvent[] }[] = [];
    for (let step = 1; step <= steps; step++) {
        world.step();
        const events = world.contactEvents();
        if (events.length > 0) {
            seen.push({ step, events });
        }
    }

    return seen;
}

function anEvent(kind: ContactEvent['kind']): unknown {
    return expect.objectContaining({ kind });
}

// The two surfaces an event names, as a sorted pair, since Box2D picks which one is A.
function surfacesOf(event: ContactEvent) {
    return [event.surfaceA, event.surfaceB].sort();
}

function bodiesOf(event: ContactEvent) {
    return [event.bodyA, event.bodyB].sort();
}

// Lets the box land and settle, then returns the world.
function landedBox(contactEventSurfaces: readonly EntityId[]) {
    const world = worldWith(contactEventSurfaces);
    addGround(world);
    const box = addBox(world);
    const landing = stepAndRecord(world, 60);

    return { world, box, landing };
}

describe('Box2dPhysicsWorld: contact events', () => {
    test('a box landing on the ground sends one begin naming both surfaces and bodies, and one end once moved away', () => {
        const { world, box, landing } = landedBox([GROUND]);

        expect(landing).toHaveLength(1);
        const begin = landing[0]?.events;
        expect(begin).toEqual([anEvent('begin')]);
        const event = begin?.[0];
        if (event === undefined) throw new Error('No begin was sent.');
        expect(surfacesOf(event)).toEqual([GROUND, BOX]);
        expect(bodiesOf(event)).toEqual([GROUND_BODY, BOX_BODY]);

        world.setPose(box, FAR_AWAY);
        const parting = stepAndRecord(world, 1);
        expect(parting).toHaveLength(1);
        expect(parting[0]?.events).toEqual([{ ...event, kind: 'end' }]);
        world.destroy();
    });

    test('one side switched on is enough, and with neither nothing is sent', () => {
        expect(landedBox([BOX]).landing.map(({ events }) => events)).toEqual([[anEvent('begin')]]);
        expect(landedBox([]).landing).toEqual([]);
    });

    test('a world made without the setting sends no contact events', () => {
        const world = engine.createWorld({ gravity: EARTH_GRAVITY });
        addGround(world);
        addBox(world);

        expect(stepAndRecord(world, 60)).toEqual([]);
        world.destroy();
    });

    test('a sensor switched on makes no contact, so sends no contact event', () => {
        const world = worldWith([GROUND]);
        addGround(world, true);
        addBox(world);

        expect(stepAndRecord(world, 60)).toEqual([]);
        world.destroy();
    });

    test("a destroyed body's end comes with the next step, still naming its entities", () => {
        const { world, box } = landedBox([GROUND]);

        world.destroyBody(box);
        const [parting] = stepAndRecord(world, 1);

        const event = parting?.events[0];
        expect(parting?.events).toHaveLength(1);
        if (event === undefined) throw new Error('No end was sent.');
        expect(event.kind).toBe('end');
        expect(surfacesOf(event)).toEqual([GROUND, BOX]);
        expect(bodiesOf(event)).toEqual([GROUND_BODY, BOX_BODY]);
        world.destroy();
    });

    test('a surface rebuilt in play gets its switch again, so its new contact begins', () => {
        const { world } = landedBox([BOX]);
        const settings = { friction: 0.3, restitution: 0 };

        // Two changes of Sensor before a step: the box is rebuilt solid where it rests. The new shape's begin
        // and the old one's end come in the same step, begins first.
        world.setSurfaceSettings(BOX, { ...settings, sensor: true });
        world.setSurfaceSettings(BOX, { ...settings, sensor: false });
        const kinds = stepAndRecord(world, 5).flatMap(({ events }) => events.map((event) => event.kind));

        expect(kinds).toEqual(['begin', 'end']);
        world.destroy();
    });

    test('two shapes of one surface touching the ground send a begin each, in the same step', () => {
        const world = worldWith([GROUND]);
        addGround(world);
        addBox(world, [boxPieceAt(-30, 20, 20), boxPieceAt(30, 20, 20)]);

        const landing = stepAndRecord(world, 60);

        expect(landing).toHaveLength(1);
        expect(landing[0]?.events).toEqual([anEvent('begin'), anEvent('begin')]);
        world.destroy();
    });

    test('velocity gives the live speed in px/s and spin in degrees per second', () => {
        const world = worldWith([], NO_GRAVITY);
        const box = addBox(world);
        world.addVelocity(box, { x: 120, y: -60 });
        world.step();

        const { linear, spin } = world.velocity(box);
        expect(linear.x).toBeCloseTo(120, 3);
        expect(linear.y).toBeCloseTo(-60, 3);
        expect(spin).toBe(0);
        world.destroy();
    });
});
