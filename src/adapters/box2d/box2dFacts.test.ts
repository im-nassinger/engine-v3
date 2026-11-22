import Box2DFactory from 'box2d3-wasm/compat';
import type { Box2DModule, b2BodyId, b2ShapeDef, b2WorldId } from 'box2d3-wasm/compat';
import { beforeAll, describe, expect, test } from 'vitest';

// The Box2D facts in docs/tech-notes.md, each checked against Box2D 3.2 itself, without the adapter, so a
// new box2d3-wasm version that changes one fails here first. Everything is in metres; 1 m is 50 px.

type BodyKind = 'static' | 'kinematic' | 'dynamic';
type Vector = { x: number; y: number };

const ONE_SECOND = 60;
const DOWN_ON_SCREEN = { x: 0, y: 10 };
const UP_ON_SCREEN = { x: 0, y: -10 };
const NO_GRAVITY = { x: 0, y: 0 };

let box2d: Box2DModule;

beforeAll(async () => {
    box2d = await Box2DFactory();
});

function createWorld(gravity: Vector) {
    const worldDefinition = box2d.b2DefaultWorldDef();
    const box2dGravity = new box2d.b2Vec2(gravity.x, gravity.y);
    worldDefinition.gravity = box2dGravity;
    box2dGravity.delete();

    const worldId = box2d.b2CreateWorld(worldDefinition);
    worldDefinition.delete();

    return worldId;
}

function createBody(worldId: b2WorldId, kind: BodyKind, position: Vector) {
    const bodyDefinition = box2d.b2DefaultBodyDef();
    bodyDefinition.type = bodyTypeOf(kind);
    const box2dPosition = new box2d.b2Vec2(position.x, position.y);
    bodyDefinition.position = box2dPosition;
    box2dPosition.delete();

    const bodyId = box2d.b2CreateBody(worldId, bodyDefinition);
    bodyDefinition.delete();

    return bodyId;
}

function bodyTypeOf(kind: BodyKind) {
    const bodyTypes = box2d.b2BodyType;

    if (kind === 'static') return bodyTypes.b2_staticBody;
    if (kind === 'kinematic') return bodyTypes.b2_kinematicBody;

    return bodyTypes.b2_dynamicBody;
}

// A box of halfWidth × halfHeight metres centred on its body.
function addBox(bodyId: b2BodyId, halfWidth: number, halfHeight: number, setUp?: (shape: b2ShapeDef) => void) {
    const shapeDefinition = box2d.b2DefaultShapeDef();
    setUp?.(shapeDefinition);

    const polygon = box2d.b2MakeBox(halfWidth, halfHeight);
    const shapeId = box2d.b2CreatePolygonShape(bodyId, shapeDefinition, polygon);
    polygon.delete();
    shapeDefinition.delete();

    return shapeId;
}

// box2d3-wasm's chain definition has ghost points the C API dropped, and refuses a chain without them.
function addChain(bodyId: b2BodyId, points: readonly Vector[]) {
    const first = points[0];
    const second = points[1];
    const beforeLast = points[points.length - 2];
    const last = points[points.length - 1];
    if (first === undefined || second === undefined || beforeLast === undefined || last === undefined) {
        throw new Error('A chain needs at least two points.');
    }

    const chainDefinition = box2d.b2DefaultChainDef();
    chainDefinition.SetPoints(points);
    chainDefinition.isLoop = false;
    const ghostBefore = new box2d.b2Vec2(2 * first.x - second.x, 2 * first.y - second.y);
    const ghostAfter = new box2d.b2Vec2(2 * last.x - beforeLast.x, 2 * last.y - beforeLast.y);
    chainDefinition.ghost1 = ghostBefore;
    chainDefinition.ghost2 = ghostAfter;
    ghostBefore.delete();
    ghostAfter.delete();

    box2d.b2CreateChain(bodyId, chainDefinition);
    chainDefinition.delete();
}

function step(worldId: b2WorldId, steps = 1) {
    for (let i = 0; i < steps; i++) {
        box2d.b2World_Step(worldId, 1 / ONE_SECOND, 4);
    }
}

function positionOf(bodyId: b2BodyId) {
    const box2dPosition = box2d.b2Body_GetPosition(bodyId);
    const position = { x: box2dPosition.x, y: box2dPosition.y };
    box2dPosition.delete();

    return position;
}

function hullSize(points: readonly Vector[]) {
    const hull = box2d.b2ComputeHull(points);
    const count = hull.count;
    hull.delete();

    return count;
}

function sensorEventCounts(worldId: b2WorldId) {
    const sensorEvents = box2d.b2World_GetSensorEvents(worldId);
    const counts = { begins: sensorEvents.beginCount, ends: sensorEvents.endCount };
    sensorEvents.delete();

    return counts;
}

type ShapeId = { index1: number; world0: number; generation: number };
type SensorEvent = { sensorShapeId: ShapeId; visitorShapeId: ShapeId };

function sensorEventsOf(worldId: b2WorldId) {
    const sensorEvents = box2d.b2World_GetSensorEvents(worldId);
    const begins: SensorEvent[] = [];
    const ends: SensorEvent[] = [];
    for (let i = 0; i < sensorEvents.beginCount; i++) {
        begins.push(sensorEvents.GetBeginEvent(i));
    }
    for (let i = 0; i < sensorEvents.endCount; i++) {
        ends.push(sensorEvents.GetEndEvent(i));
    }
    sensorEvents.delete();

    return { begins, ends };
}

function setUpSensor(shape: b2ShapeDef) {
    shape.isSensor = true;
    shape.enableSensorEvents = true;
}

function setUpVisitor(shape: b2ShapeDef) {
    shape.enableSensorEvents = true;
}

function setVelocity(bodyId: b2BodyId, velocity: Vector) {
    const box2dVelocity = new box2d.b2Vec2(velocity.x, velocity.y);
    box2d.b2Body_SetLinearVelocity(bodyId, box2dVelocity);
    box2dVelocity.delete();
}

// A Static sensor 2 × sensorHalfWidth m wide at the origin, and a 0.6 m visitor starting 3 m to its left, moving
// right at speed m/s. Returns, for each step with a sensor event, the step and the visitor's x after it.
function passThroughSensor(visitorKind: BodyKind, speed: number, steps: number, sensorHalfWidth = 1) {
    const worldId = createWorld(NO_GRAVITY);
    const sensor = addBox(createBody(worldId, 'static', { x: 0, y: 0 }), sensorHalfWidth, 1, setUpSensor);
    const visitorBody = createBody(worldId, visitorKind, { x: -3, y: 0 });
    const visitor = addBox(visitorBody, 0.3, 0.3, setUpVisitor);
    setVelocity(visitorBody, { x: speed, y: 0 });

    const seen: { step: number; kind: 'begin' | 'end'; x: number; event: SensorEvent }[] = [];
    for (let i = 0; i < steps; i++) {
        step(worldId);
        const events = sensorEventsOf(worldId);
        const x = positionOf(visitorBody).x;
        for (const event of events.begins) {
            seen.push({ step: i, kind: 'begin', x, event });
        }
        for (const event of events.ends) {
            seen.push({ step: i, kind: 'end', x, event });
        }
    }
    box2d.b2DestroyWorld(worldId);

    return { sensor, visitor, seen };
}

function contactEventCounts(worldId: b2WorldId) {
    const contactEvents = box2d.b2World_GetContactEvents(worldId);
    const counts = { begins: contactEvents.beginCount, ends: contactEvents.endCount };
    contactEvents.delete();

    return counts;
}

function touchingContactCount(bodyId: b2BodyId) {
    const contacts: unknown = box2d.b2Body_GetContactData(bodyId, 4);
    if (!Array.isArray(contacts)) return 0;

    return contacts.length;
}

// A ground whose top edge is at y = 1.6 m, and a 0.8 m box dropped onto it.
const GROUND_TOP = 1.6;

function dropBoxOnGround(groundX: number) {
    const worldId = createWorld(DOWN_ON_SCREEN);
    const ground = createBody(worldId, 'static', { x: groundX, y: 2 });
    addBox(ground, 20, 0.4);
    const box = createBody(worldId, 'dynamic', { x: groundX, y: 0 });
    addBox(box, 0.4, 0.4);

    step(worldId, 2 * ONE_SECOND);
    const boxBottom = positionOf(box).y + 0.4;
    box2d.b2DestroyWorld(worldId);

    return { gapInPixels: (GROUND_TOP - boxBottom) * 50 };
}

describe('Box2D 3.2: polygons and lines', () => {
    test('a hull of fewer than 3 usable points is empty, never a 2×2 m box', () => {
        const twoPoints = [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
        ];
        const inARow = [...twoPoints, { x: 2, y: 0 }];
        // 0.5 px sides: the corner is within 0.5 px of the line through the other two.
        const tooSmall = [
            { x: 0, y: 0 },
            { x: 0.01, y: 0 },
            { x: 0, y: 0.01 },
        ];
        // 1 px sides.
        const justBigEnough = [
            { x: 0, y: 0 },
            { x: 0.02, y: 0 },
            { x: 0, y: 0.02 },
        ];

        // 50 px long; a point within 0.5 px of the line through its neighbours is dropped.
        const thinnerThanHalfAPixel = [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 0.5, y: 0.009 },
        ];
        const thickerThanHalfAPixel = [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 0.5, y: 0.011 },
        ];

        expect(hullSize(twoPoints)).toBe(0);
        expect(hullSize(inARow)).toBe(0);
        expect(hullSize(tooSmall)).toBe(0);
        expect(hullSize(justBigEnough)).toBe(3);
        expect(hullSize(thinnerThanHalfAPixel)).toBe(0);
        expect(hullSize(thickerThanHalfAPixel)).toBe(3);
    });

    test('a polygon has no skin: a box rests within 0.01 px of the box under it', () => {
        const polygon = box2d.b2MakeBox(1, 1);
        const radius = polygon.radius;
        polygon.delete();

        const resting = dropBoxOnGround(0);

        expect(radius).toBe(0);
        expect(Math.abs(resting.gapInPixels)).toBeLessThan(0.01);
    });

    test('a chain is one-sided: it holds a body only on the right of the way it was drawn', () => {
        const leftToRight = [
            { x: -10, y: 2 },
            { x: 0, y: 2 },
            { x: 10, y: 2 },
        ];
        const rightToLeft = [...leftToRight].reverse();

        function dropOnChain(points: readonly Vector[], fromAbove: boolean) {
            const gravity = fromAbove ? DOWN_ON_SCREEN : UP_ON_SCREEN;
            const startY = fromAbove ? 0 : 4;
            const worldId = createWorld(gravity);
            const ground = createBody(worldId, 'static', { x: 0, y: 0 });
            addChain(ground, points);
            const box = createBody(worldId, 'dynamic', { x: 0, y: startY });
            addBox(box, 0.3, 0.3);

            step(worldId, 2 * ONE_SECOND);
            const boxY = positionOf(box).y;
            box2d.b2DestroyWorld(worldId);

            return Math.abs(boxY - 2) < 0.31;
        }

        expect(dropOnChain(leftToRight, true)).toBe(true);
        expect(dropOnChain(leftToRight, false)).toBe(false);
        expect(dropOnChain(rightToLeft, true)).toBe(false);
        expect(dropOnChain(rightToLeft, false)).toBe(true);
    });

    test('chain points 0.2 px apart still hold a body', () => {
        const worldId = createWorld(DOWN_ON_SCREEN);
        const ground = createBody(worldId, 'static', { x: 0, y: 0 });
        addChain(ground, [
            { x: -10, y: 2 },
            { x: 0, y: 2 },
            { x: 0.004, y: 2 },
            { x: 10, y: 2 },
        ]);
        const box = createBody(worldId, 'dynamic', { x: 0, y: 0 });
        addBox(box, 0.3, 0.3);

        step(worldId, 2 * ONE_SECOND);

        expect(positionOf(box).y).toBeCloseTo(1.7, 2);
        box2d.b2DestroyWorld(worldId);
    });
});

describe('Box2D 3.2: mass, gravity and limits', () => {
    test('a Dynamic body with no surfaces has no mass and never moves', () => {
        const worldId = createWorld(DOWN_ON_SCREEN);
        const body = createBody(worldId, 'dynamic', { x: 0, y: 0 });

        step(worldId, ONE_SECOND);

        expect(box2d.b2Body_GetMass(body)).toBe(0);
        expect(positionOf(body)).toEqual({ x: 0, y: 0 });
        box2d.b2DestroyWorld(worldId);
    });

    test('a sensor with a density adds mass to its body', () => {
        const worldId = createWorld(NO_GRAVITY);
        const body = createBody(worldId, 'dynamic', { x: 0, y: 0 });
        addBox(body, 0.5, 0.5, (shape) => {
            shape.isSensor = true;
        });

        expect(box2d.b2Body_GetMass(body)).toBe(1);
        box2d.b2DestroyWorld(worldId);
    });

    test('changing gravity leaves a sleeping body asleep', () => {
        const worldId = createWorld(NO_GRAVITY);
        const body = createBody(worldId, 'dynamic', { x: 0, y: 0 });
        addBox(body, 0.5, 0.5);
        step(worldId, 2 * ONE_SECOND);
        const asleepBefore = !box2d.b2Body_IsAwake(body);

        const gravity = new box2d.b2Vec2(DOWN_ON_SCREEN.x, DOWN_ON_SCREEN.y);
        box2d.b2World_SetGravity(worldId, gravity);
        gravity.delete();
        step(worldId, ONE_SECOND);

        expect(asleepBefore).toBe(true);
        expect(box2d.b2Body_IsAwake(body)).toBe(false);
        expect(positionOf(body)).toEqual({ x: 0, y: 0 });
        box2d.b2DestroyWorld(worldId);
    });

    test('movement per step has no fixed cap: 300 m/s (15,000 px/s) is kept under the default 400 m/s', () => {
        const worldDefinition = box2d.b2DefaultWorldDef();
        const defaultMaximumSpeed = worldDefinition.maximumLinearSpeed;
        worldDefinition.delete();

        const worldId = createWorld(NO_GRAVITY);
        const body = createBody(worldId, 'dynamic', { x: 0, y: 0 });
        addBox(body, 0.5, 0.5);
        const velocity = new box2d.b2Vec2(300, 0);
        box2d.b2Body_SetLinearVelocity(body, velocity);
        velocity.delete();
        step(worldId);

        expect(defaultMaximumSpeed).toBe(400);
        expect(positionOf(body).x).toBeCloseTo(5, 5);
        box2d.b2DestroyWorld(worldId);
    });

    test('rotation per step is held to 45°', () => {
        const worldId = createWorld(NO_GRAVITY);
        const body = createBody(worldId, 'dynamic', { x: 0, y: 0 });
        addBox(body, 0.5, 0.5);
        box2d.b2Body_SetAngularVelocity(body, 1000);
        step(worldId);

        const degreesPerSecond = (box2d.b2Body_GetAngularVelocity(body) * 180) / Math.PI;

        expect(degreesPerSecond).toBeCloseTo(2700, 3);
        box2d.b2DestroyWorld(worldId);
    });

    test('a positive spin turns clockwise on screen, with y pointing down', () => {
        const worldId = createWorld(NO_GRAVITY);
        const body = createBody(worldId, 'dynamic', { x: 0, y: 0 });
        addBox(body, 0.5, 0.5);
        box2d.b2Body_SetAngularVelocity(body, 1);
        step(worldId);

        const rotation = box2d.b2Body_GetRotation(body);
        // The body's x axis now points a little towards +y, which is downwards on screen.
        const xAxisTurnedDown = rotation.s > 0;
        rotation.delete();

        expect(xAxisTurnedDown).toBe(true);
        box2d.b2DestroyWorld(worldId);
    });

    test('a box rests the same 4,000 m (200,000 px) from the origin as at it', () => {
        const atOrigin = dropBoxOnGround(0);
        const farAway = dropBoxOnGround(4000);

        expect(Math.abs(farAway.gapInPixels - atOrigin.gapInPixels)).toBeLessThan(0.01);
    });
});

describe('Box2D 3.2: contacts and sensors', () => {
    function overlappingSensor(sensorKind: BodyKind, visitorKind: BodyKind, sensorEvents = true) {
        const worldId = createWorld(NO_GRAVITY);
        const sensorBody = createBody(worldId, sensorKind, { x: 0, y: 0 });
        addBox(sensorBody, 1, 1, (shape) => {
            shape.isSensor = true;
            shape.enableSensorEvents = sensorEvents;
        });
        const visitor = createBody(worldId, visitorKind, { x: 0, y: 0 });
        addBox(visitor, 0.3, 0.3, (shape) => {
            shape.enableSensorEvents = true;
        });

        step(worldId);
        const counts = sensorEventCounts(worldId);
        const visitorContacts = touchingContactCount(visitor);
        box2d.b2DestroyWorld(worldId);

        return { begins: counts.begins, visitorContacts };
    }

    test('surfaces send no events unless asked', () => {
        const shapeDefinition = box2d.b2DefaultShapeDef();
        const sensorEvents = shapeDefinition.enableSensorEvents;
        const contactEvents = shapeDefinition.enableContactEvents;
        shapeDefinition.delete();

        expect(sensorEvents).toBe(false);
        expect(contactEvents).toBe(false);
        expect(overlappingSensor('static', 'dynamic', false).begins).toBe(0);
    });

    test('a sensor sees bodies of every type in its first step, and makes no contact', () => {
        const kinds: BodyKind[] = ['static', 'kinematic', 'dynamic'];

        for (const sensorKind of kinds) {
            for (const visitorKind of kinds) {
                const result = overlappingSensor(sensorKind, visitorKind);

                expect(result.begins).toBe(1);
                expect(result.visitorContacts).toBe(0);
            }
        }
    });

    test('two overlapping sensors each see the other: two begins, each naming the other as the visitor', () => {
        const worldId = createWorld(NO_GRAVITY);
        const still = addBox(createBody(worldId, 'static', { x: 0, y: 0 }), 1, 1, setUpSensor);
        const moving = addBox(createBody(worldId, 'dynamic', { x: 0, y: 0 }), 0.3, 0.3, setUpSensor);

        step(worldId);
        const { begins } = sensorEventsOf(worldId);

        expect(begins).toHaveLength(2);
        expect(begins).toContainEqual({ sensorShapeId: still, visitorShapeId: moving });
        expect(begins).toContainEqual({ sensorShapeId: moving, visitorShapeId: still });
        box2d.b2DestroyWorld(worldId);
    });

    test('a contact forms only if one body is Dynamic', () => {
        const worldId = createWorld(NO_GRAVITY);
        const setUpEvents = (shape: b2ShapeDef) => {
            shape.enableContactEvents = true;
        };
        addBox(createBody(worldId, 'static', { x: 0, y: 0 }), 1, 1, setUpEvents);
        const kinematic = createBody(worldId, 'kinematic', { x: 0, y: 0 });
        addBox(kinematic, 0.3, 0.3, setUpEvents);

        step(worldId, 2);

        expect(contactEventCounts(worldId).begins).toBe(0);
        expect(box2d.b2Body_GetContactCapacity(kinematic)).toBe(0);
        box2d.b2DestroyWorld(worldId);
    });

    test('a contact 1 px apart exists but is not touching, and lists no contact data', () => {
        const worldId = createWorld(NO_GRAVITY);
        const setUpEvents = (shape: b2ShapeDef) => {
            shape.enableContactEvents = true;
        };
        addBox(createBody(worldId, 'static', { x: 0, y: 2 }), 5, 0.5, setUpEvents);
        const box = createBody(worldId, 'dynamic', { x: 0, y: 2 - 0.5 - 0.3 - 0.02 });
        addBox(box, 0.3, 0.3, setUpEvents);

        step(worldId);

        expect(box2d.b2Body_GetContactCapacity(box)).toBe(1);
        expect(touchingContactCount(box)).toBe(0);
        expect(contactEventCounts(worldId).begins).toBe(0);
        box2d.b2DestroyWorld(worldId);
    });

    test("destroying a body sends its contact's end with the next step's events", () => {
        const worldId = createWorld(DOWN_ON_SCREEN);
        const setUpEvents = (shape: b2ShapeDef) => {
            shape.enableContactEvents = true;
        };
        addBox(createBody(worldId, 'static', { x: 0, y: 2 }), 5, 0.5, setUpEvents);
        const box = createBody(worldId, 'dynamic', { x: 0, y: 1 });
        addBox(box, 0.3, 0.3, setUpEvents);
        step(worldId, ONE_SECOND);

        box2d.b2DestroyBody(box);
        const endsRightAway = contactEventCounts(worldId).ends;
        step(worldId);
        const endsAfterStep = contactEventCounts(worldId).ends;

        expect(endsRightAway).toBe(0);
        expect(endsAfterStep).toBe(1);
        box2d.b2DestroyWorld(worldId);
    });

    test('a Kinematic or Dynamic visitor passing a Static sensor sends one begin and one end, naming both surfaces', () => {
        for (const visitorKind of ['kinematic', 'dynamic'] as const) {
            // 0.1 m a step: the visitor's right edge meets the sensor's left edge (x = -1) after step 17.
            const { sensor, visitor, seen } = passThroughSensor(visitorKind, 6, 60);
            const pair = { sensorShapeId: sensor, visitorShapeId: visitor };

            expect(seen.map((event) => event.kind)).toEqual(['begin', 'end']);
            expect(seen[0]?.event).toEqual(pair);
            expect(seen[1]?.event).toEqual(pair);
            // The begin comes in the step that makes them overlap (edges just meeting count),
            // the end in the step that parts them: no step late.
            expect(seen[0]?.x).toBeCloseTo(-1.3, 4);
            expect(seen[1]?.x).toBeCloseTo(1.4, 4);
        }
    });

    test('a Kinematic body that skips a sensor between steps sends nothing; a Dynamic one still sends begin, then end', () => {
        // 6,000 px/s, the game's speed cap, is 2 m a step: the visitor is at x = -1 m, then 1 m, never over the
        // 1 px sensor at the end of a step.
        const kinematic = passThroughSensor('kinematic', 120, 4, 0.01);
        const dynamic = passThroughSensor('dynamic', 120, 4, 0.01);

        expect(kinematic.seen).toEqual([]);
        expect(dynamic.seen.map((event) => [event.step, event.kind])).toEqual([
            [1, 'begin'],
            [2, 'end'],
        ]);
    });

    test("destroying a body inside a sensor sends the sensor's end with the next step's events, naming a shape that is gone", () => {
        const worldId = createWorld(NO_GRAVITY);
        const sensor = addBox(createBody(worldId, 'static', { x: 0, y: 0 }), 1, 1, setUpSensor);
        const visitorBody = createBody(worldId, 'dynamic', { x: 0, y: 0 });
        const visitor = addBox(visitorBody, 0.3, 0.3, setUpVisitor);
        step(worldId);

        box2d.b2DestroyBody(visitorBody);
        const endsRightAway = sensorEventCounts(worldId).ends;
        step(worldId);
        const { ends } = sensorEventsOf(worldId);
        // The next shape made takes the freed slot, with a new generation.
        const next = addBox(createBody(worldId, 'dynamic', { x: 10, y: 0 }), 0.3, 0.3, setUpVisitor);

        expect(endsRightAway).toBe(0);
        expect(ends).toEqual([{ sensorShapeId: sensor, visitorShapeId: visitor }]);
        expect(box2d.b2Shape_IsValid(visitor)).toBe(false);
        expect(next.index1).toBe(visitor.index1);
        expect(next.generation).not.toBe(visitor.generation);
        box2d.b2DestroyWorld(worldId);
    });

    test("destroying a sensor's body sends its end with the next step's events", () => {
        const worldId = createWorld(NO_GRAVITY);
        const sensorBody = createBody(worldId, 'static', { x: 0, y: 0 });
        const sensor = addBox(sensorBody, 1, 1, setUpSensor);
        const visitor = addBox(createBody(worldId, 'dynamic', { x: 0, y: 0 }), 0.3, 0.3, setUpVisitor);
        step(worldId);

        box2d.b2DestroyBody(sensorBody);
        const endsRightAway = sensorEventCounts(worldId).ends;
        step(worldId);

        expect(endsRightAway).toBe(0);
        expect(sensorEventsOf(worldId).ends).toEqual([{ sensorShapeId: sensor, visitorShapeId: visitor }]);
        box2d.b2DestroyWorld(worldId);
    });

    test("turning a sensor's events off sends its ends, and on again sends its begins", () => {
        const worldId = createWorld(NO_GRAVITY);
        const sensor = addBox(createBody(worldId, 'static', { x: 0, y: 0 }), 1, 1, setUpSensor);
        const visitor = addBox(createBody(worldId, 'dynamic', { x: 0, y: 0 }), 0.3, 0.3, setUpVisitor);
        const pair = { sensorShapeId: sensor, visitorShapeId: visitor };
        step(worldId);

        box2d.b2Shape_EnableSensorEvents(sensor, false);
        step(worldId);
        const whenOff = sensorEventsOf(worldId);
        box2d.b2Shape_EnableSensorEvents(sensor, true);
        step(worldId);
        const whenOn = sensorEventsOf(worldId);

        expect(whenOff).toEqual({ begins: [], ends: [pair] });
        expect(whenOn).toEqual({ begins: [pair], ends: [] });
        box2d.b2DestroyWorld(worldId);
    });

    test('a surface has no switch between sensor and solid; destroying it sends its ends and a new one its begins', () => {
        const worldId = createWorld(NO_GRAVITY);
        const sensorBody = createBody(worldId, 'static', { x: 0, y: 0 });
        const sensor = addBox(sensorBody, 1, 1, setUpSensor);
        const visitor = addBox(createBody(worldId, 'dynamic', { x: 0, y: 0 }), 0.3, 0.3, setUpVisitor);
        step(worldId);

        box2d.b2DestroyShape(sensor, true);
        const rebuilt = addBox(sensorBody, 1, 1, setUpSensor);
        step(worldId);

        expect('b2Shape_SetSensor' in box2d).toBe(false);
        expect(box2d.b2Shape_IsSensor(rebuilt)).toBe(true);
        expect(sensorEventsOf(worldId)).toEqual({
            begins: [{ sensorShapeId: rebuilt, visitorShapeId: visitor }],
            ends: [{ sensorShapeId: sensor, visitorShapeId: visitor }],
        });
        box2d.b2DestroyWorld(worldId);
    });
});
