import { beforeAll, describe, expect, test } from 'vitest';

import type { Point } from '../../core/geometry/index.ts';
import type { PhysicsWorld, SensorEvent } from '../../core/physics/index.ts';

import { Box2dPhysicsEngine } from './Box2dPhysicsEngine.ts';
import { NO_GRAVITY, bodyDefinition, boxPiece, surfaceDefinition } from './testing/worldTesting.ts';

const COIN_BODY = 1;
const COIN = 2;
const BALL_BODY = 3;
const BALL = 4;
const SURFACE_SETTINGS = { friction: 0.3, restitution: 0 };

const engine = new Box2dPhysicsEngine();

beforeAll(async () => {
    await engine.load();
});

// A Static 100 px coin at the origin, its sensor surface on an entity of its own.
function addCoin(world: PhysicsWorld, sensor = true) {
    const body = world.createBody(bodyDefinition({ entity: COIN_BODY, type: 'static' }));
    world.addSurface(body, surfaceDefinition({ entity: COIN, pieces: [boxPiece(100, 100)], sensor }));

    return body;
}

// A Dynamic 20 px box whose surface is on a child entity.
function addBall(world: PhysicsWorld, position: Point, entities = { body: BALL_BODY, surface: BALL }, sensor = false) {
    const body = world.createBody(bodyDefinition({ entity: entities.body, position }));
    world.addSurface(body, surfaceDefinition({ entity: entities.surface, pieces: [boxPiece(20, 20)], sensor }));

    return body;
}

function eventsOfStep(world: PhysicsWorld) {
    world.step();
    const events: SensorEvent[] = [];
    world.readSensorEvents(events);

    return events;
}

function ballEvent(kind: SensorEvent['kind']): SensorEvent {
    return { kind, sensor: COIN, visitor: BALL, visitorBody: BALL_BODY, visitorIsSensor: false };
}

describe('Box2dPhysicsWorld: sensor events', () => {
    test('a body crossing a sensor sends one begin and one end, each in its own step, naming both entities', () => {
        const world = engine.createWorld({ gravity: NO_GRAVITY });
        addCoin(world);
        const ball = addBall(world, { x: -200, y: 0 });
        // 600 px/s is 10 px a step: the edges meet after step 14, and part after step 26.
        world.addVelocity(ball, { x: 600, y: 0 });

        const seen: { step: number; event: SensorEvent }[] = [];
        for (let step = 1; step <= 40; step++) {
            for (const event of eventsOfStep(world)) {
                seen.push({ step, event });
            }
        }

        expect(seen.map(({ event }) => event)).toEqual([ballEvent('begin'), ballEvent('end')]);
        const [begin, end] = seen;
        expect(begin?.step).toBeGreaterThanOrEqual(13);
        expect(begin?.step).toBeLessThanOrEqual(15);
        expect(end?.step).toBeGreaterThanOrEqual(25);
        expect(end?.step).toBeLessThanOrEqual(28);
        world.destroy();
    });

    test('each step gives only its own events', () => {
        const world = engine.createWorld({ gravity: NO_GRAVITY });
        addCoin(world);
        addBall(world, { x: 0, y: 0 });

        expect(eventsOfStep(world)).toEqual([ballEvent('begin')]);
        expect(eventsOfStep(world)).toEqual([]);
        world.destroy();
    });

    test("a destroyed body's end comes with the next step, naming it, even when its slot holds a new surface", () => {
        const world = engine.createWorld({ gravity: NO_GRAVITY });
        addCoin(world);
        const ball = addBall(world, { x: 0, y: 0 });
        eventsOfStep(world);

        world.destroyBody(ball);
        // Box2D gives the freed shape slot to the next shape made.
        addBall(world, { x: 0, y: 0 }, { body: 7, surface: 8 });

        expect(eventsOfStep(world)).toEqual([
            { kind: 'begin', sensor: COIN, visitor: 8, visitorBody: 7, visitorIsSensor: false },
            ballEvent('end'),
        ]);
        expect(eventsOfStep(world)).toEqual([]);
        world.destroy();
    });

    test("a destroyed sensor's end comes with the next step", () => {
        const world = engine.createWorld({ gravity: NO_GRAVITY });
        const coin = addCoin(world);
        addBall(world, { x: 0, y: 0 });
        eventsOfStep(world);

        world.destroyBody(coin);

        expect(eventsOfStep(world)).toEqual([ballEvent('end')]);
        world.destroy();
    });

    test('a sensor sees another sensor, marked as one, and each sees the other', () => {
        const world = engine.createWorld({ gravity: NO_GRAVITY });
        addCoin(world);
        addBall(world, { x: 0, y: 0 }, { body: BALL_BODY, surface: BALL }, true);

        const events = eventsOfStep(world);

        expect(events).toHaveLength(2);
        expect(events).toContainEqual({
            kind: 'begin',
            sensor: COIN,
            visitor: BALL,
            visitorBody: BALL_BODY,
            visitorIsSensor: true,
        });
        expect(events).toContainEqual({
            kind: 'begin',
            sensor: BALL,
            visitor: COIN,
            visitorBody: COIN_BODY,
            visitorIsSensor: true,
        });
        world.destroy();
    });

    test('a surface on the ground is named after its body, the World', () => {
        const world = engine.createWorld({ gravity: NO_GRAVITY });
        const ground = world.createBody(bodyDefinition({ entity: 0, type: 'static' }));
        world.addSurface(ground, surfaceDefinition({ entity: 0, pieces: [boxPiece(400, 20)] }));
        const ballBody = world.createBody(bodyDefinition({ entity: BALL_BODY }));
        world.addSurface(ballBody, surfaceDefinition({ entity: BALL, pieces: [boxPiece(100, 100)], sensor: true }));

        expect(eventsOfStep(world)).toEqual([
            { kind: 'begin', sensor: BALL, visitor: 0, visitorBody: 0, visitorIsSensor: false },
        ]);
        world.destroy();
    });

    test('switching Sensor off ends its overlaps, and on again begins them, each in the next step', () => {
        const world = engine.createWorld({ gravity: NO_GRAVITY });
        addCoin(world);
        addBall(world, { x: 0, y: 0 });
        eventsOfStep(world);

        world.setSurfaceSettings(COIN, { ...SURFACE_SETTINGS, sensor: false });
        expect(eventsOfStep(world)).toEqual([ballEvent('end')]);

        world.setSurfaceSettings(COIN, { ...SURFACE_SETTINGS, sensor: true });
        expect(eventsOfStep(world)).toEqual([ballEvent('begin')]);
        world.destroy();
    });

    test('a visitor rebuilt as a sensor sends its end and its new begin in the same step', () => {
        const world = engine.createWorld({ gravity: NO_GRAVITY });
        addCoin(world);
        addBall(world, { x: 0, y: 0 });
        eventsOfStep(world);

        world.setSurfaceSettings(BALL, { ...SURFACE_SETTINGS, sensor: true });
        const events = eventsOfStep(world);

        expect(events).toContainEqual(ballEvent('end'));
        expect(events).toContainEqual({ ...ballEvent('begin'), visitorIsSensor: true });
        world.destroy();
    });

    test('changing Friction or Restitution sends no sensor event', () => {
        const world = engine.createWorld({ gravity: NO_GRAVITY });
        addCoin(world);
        addBall(world, { x: 0, y: 0 });
        eventsOfStep(world);

        world.setSurfaceSettings(COIN, { friction: 1, restitution: 1, sensor: true });
        world.setSurfaceSettings(BALL, { friction: 1, restitution: 1, sensor: false });

        expect(eventsOfStep(world)).toEqual([]);
        world.destroy();
    });
});
