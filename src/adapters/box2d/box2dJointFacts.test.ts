import Box2DFactory from 'box2d3-wasm/compat';
import type { Box2DModule, b2BodyId, b2WorldId } from 'box2d3-wasm/compat';
import { beforeAll, describe, expect, test } from 'vitest';

// The joint facts in docs/tech-notes.md, each checked against Box2D 3.2 itself, without the adapter, so a
// new box2d3-wasm version that changes one fails here first. Everything is in metres; 1 m is 50 px.

type BodyKind = 'static' | 'dynamic';
type Vector = { x: number; y: number };

const ONE_SECOND = 60;
const DOWN_ON_SCREEN = { x: 0, y: 10 };
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

// A body with a box of 2 × halfSize metres a side, of the given density.
function createBoxBody(worldId: b2WorldId, kind: BodyKind, position: Vector, halfSize = 0.5, density = 1) {
    const bodyDefinition = box2d.b2DefaultBodyDef();
    if (kind === 'dynamic') {
        bodyDefinition.type = box2d.b2BodyType.b2_dynamicBody;
    }
    const box2dPosition = new box2d.b2Vec2(position.x, position.y);
    bodyDefinition.position = box2dPosition;
    box2dPosition.delete();

    const bodyId = box2d.b2CreateBody(worldId, bodyDefinition);
    bodyDefinition.delete();

    const shapeDefinition = box2d.b2DefaultShapeDef();
    shapeDefinition.density = density;
    const polygon = box2d.b2MakeBox(halfSize, halfSize);
    box2d.b2CreatePolygonShape(bodyId, shapeDefinition, polygon);
    polygon.delete();
    shapeDefinition.delete();

    return bodyId;
}

type HingeSetUp = {
    lowerAngle?: number;
    upperAngle?: number;
    forceThreshold?: number;
    userData?: number;
};

function createHinge(worldId: b2WorldId, bodyIdA: b2BodyId, bodyIdB: b2BodyId, setUp: HingeSetUp = {}) {
    const hingeDefinition = box2d.b2DefaultRevoluteJointDef();
    hingeDefinition.base.bodyIdA = bodyIdA;
    hingeDefinition.base.bodyIdB = bodyIdB;

    if (setUp.lowerAngle !== undefined && setUp.upperAngle !== undefined) {
        hingeDefinition.enableLimit = true;
        hingeDefinition.lowerAngle = setUp.lowerAngle;
        hingeDefinition.upperAngle = setUp.upperAngle;
    }
    if (setUp.forceThreshold !== undefined) {
        hingeDefinition.base.forceThreshold = setUp.forceThreshold;
    }
    if (setUp.userData !== undefined) {
        hingeDefinition.base.userData = setUp.userData;
    }

    const jointId = box2d.b2CreateRevoluteJoint(worldId, hingeDefinition);
    hingeDefinition.delete();

    return jointId;
}

function step(worldId: b2WorldId, steps = 1) {
    for (let i = 0; i < steps; i++) {
        box2d.b2World_Step(worldId, 1 / ONE_SECOND, 4);
    }
}

function xOf(bodyId: b2BodyId) {
    const box2dPosition = box2d.b2Body_GetPosition(bodyId);
    const x = box2dPosition.x;
    box2dPosition.delete();

    return x;
}

function radians(degrees: number) {
    return (degrees * Math.PI) / 180;
}

describe('Box2D 3.2: joint ends and angles', () => {
    test("a hinge's angle is body B's turn against body A", () => {
        const worldId = createWorld(NO_GRAVITY);
        const bodyA = createBoxBody(worldId, 'dynamic', { x: 0, y: 0 });
        const bodyB = createBoxBody(worldId, 'dynamic', { x: 0, y: 0 });
        const hingeId = createHinge(worldId, bodyA, bodyB);

        box2d.b2Body_SetAngularVelocity(bodyB, 1);
        step(worldId);
        const afterTurningB = box2d.b2RevoluteJoint_GetCurrentAngle(hingeId);

        box2d.b2Body_SetAngularVelocity(bodyB, 0);
        box2d.b2Body_SetAngularVelocity(bodyA, 2);
        step(worldId);
        const afterTurningA = box2d.b2RevoluteJoint_GetCurrentAngle(hingeId);

        expect(afterTurningB).toBeGreaterThan(0);
        expect(afterTurningA).toBeLessThan(afterTurningB);
        box2d.b2DestroyWorld(worldId);
    });

    test("a slider's axis is the x axis of body A's frame: the definition has no axis of its own", () => {
        const sliderDefinition = box2d.b2DefaultPrismaticJointDef();
        const hasOwnAxis = 'localAxisA' in sliderDefinition;
        sliderDefinition.delete();

        expect(hasOwnAxis).toBe(false);
    });
});

describe('Box2D 3.2: the distance joint', () => {
    function pushedTowardsAnchor(setUp: (definition: ReturnType<Box2DModule['b2DefaultDistanceJointDef']>) => void) {
        const worldId = createWorld(NO_GRAVITY);
        const anchor = createBoxBody(worldId, 'static', { x: 0, y: 0 }, 0.1);
        const weight = createBoxBody(worldId, 'dynamic', { x: 2, y: 0 });

        const distanceDefinition = box2d.b2DefaultDistanceJointDef();
        distanceDefinition.base.bodyIdA = anchor;
        distanceDefinition.base.bodyIdB = weight;
        distanceDefinition.length = 2;
        setUp(distanceDefinition);
        box2d.b2CreateDistanceJoint(worldId, distanceDefinition);
        distanceDefinition.delete();

        const towardsAnchor = new box2d.b2Vec2(-2, 0);
        box2d.b2Body_SetLinearVelocity(weight, towardsAnchor);
        towardsAnchor.delete();
        step(worldId, 30);

        const x = xOf(weight);
        box2d.b2DestroyWorld(worldId);

        return x;
    }

    test('one joint makes a Rod, a Rope and a Spring', () => {
        const rod = pushedTowardsAnchor(() => {});
        const rope = pushedTowardsAnchor((definition) => {
            definition.enableSpring = true;
            definition.hertz = 0;
            definition.enableLimit = true;
            definition.minLength = 0;
            definition.maxLength = 2;
        });
        const spring = pushedTowardsAnchor((definition) => {
            definition.enableSpring = true;
            definition.hertz = 1;
            definition.dampingRatio = 0;
        });

        // With its spring off, the default, the joint is rigid.
        expect(rod).toBeCloseTo(2, 5);
        // Half a second at 2 m/s with nothing pulling back.
        expect(rope).toBeCloseTo(1, 2);
        // A spring pulls back, so it moves less than the slack Rope.
        expect(spring).toBeGreaterThan(rope);
        expect(spring).toBeLessThan(2);
    });

    test('stiffness is bounces per second whatever the mass', () => {
        function turningSteps(density: number) {
            const worldId = createWorld(NO_GRAVITY);
            const anchor = createBoxBody(worldId, 'static', { x: 0, y: 0 }, 0.1);
            const weight = createBoxBody(worldId, 'dynamic', { x: 2, y: 0 }, 0.5, density);

            const distanceDefinition = box2d.b2DefaultDistanceJointDef();
            distanceDefinition.base.bodyIdA = anchor;
            distanceDefinition.base.bodyIdB = weight;
            distanceDefinition.length = 1;
            distanceDefinition.enableSpring = true;
            distanceDefinition.hertz = 2;
            distanceDefinition.dampingRatio = 0;
            box2d.b2CreateDistanceJoint(worldId, distanceDefinition);
            distanceDefinition.delete();

            const steps: number[] = [];
            let previousX = xOf(weight);
            let direction = -1;
            for (let i = 0; i < 2 * ONE_SECOND; i++) {
                step(worldId);
                const x = xOf(weight);
                const newDirection = Math.sign(x - previousX);
                if (newDirection !== 0 && newDirection !== direction) {
                    steps.push(i);
                    direction = newDirection;
                }
                previousX = x;
            }

            const mass = box2d.b2Body_GetMass(weight);
            box2d.b2DestroyWorld(worldId);

            return { mass, steps };
        }

        const light = turningSteps(1);
        const heavy = turningSteps(4);

        expect(light.mass).toBe(1);
        expect(heavy.mass).toBe(4);
        // 2 bounces per second turn back every quarter of a second, 15 steps, for both.
        expect(light.steps.slice(0, 4)).toEqual([15, 30, 45, 60]);
        expect(heavy.steps).toEqual(light.steps);
    });
});

describe('Box2D 3.2: limits, ends and destroying', () => {
    test('a limit without 0 lurches: the hinge jumps into it in the first steps', () => {
        const worldId = createWorld(NO_GRAVITY);
        const ground = createBoxBody(worldId, 'static', { x: 0, y: 0 }, 0.1);
        const door = createBoxBody(worldId, 'dynamic', { x: 0, y: 0 });
        const hingeId = createHinge(worldId, ground, door, { lowerAngle: radians(30), upperAngle: radians(60) });

        step(worldId);
        const afterOneStep = box2d.b2RevoluteJoint_GetCurrentAngle(hingeId);
        step(worldId, 9);
        const afterTenSteps = box2d.b2RevoluteJoint_GetCurrentAngle(hingeId);

        expect(afterOneStep).toBeGreaterThan(radians(15));
        expect(afterTenSteps).toBeCloseTo(radians(30), 2);
        box2d.b2DestroyWorld(worldId);
    });

    test('a joint with both ends on one body is made and stepped without an error', () => {
        const worldId = createWorld(NO_GRAVITY);
        const body = createBoxBody(worldId, 'dynamic', { x: 0, y: 0 });
        const hingeId = createHinge(worldId, body, body);

        step(worldId);

        expect(box2d.b2Joint_IsValid(hingeId)).toBe(true);
        box2d.b2DestroyWorld(worldId);
    });

    test('a joint between two Static bodies is made', () => {
        const worldId = createWorld(DOWN_ON_SCREEN);
        const left = createBoxBody(worldId, 'static', { x: 0, y: 0 });
        const right = createBoxBody(worldId, 'static', { x: 1, y: 0 });
        const hingeId = createHinge(worldId, left, right);

        step(worldId);

        expect(box2d.b2Joint_IsValid(hingeId)).toBe(true);
        box2d.b2DestroyWorld(worldId);
    });

    test('a joint has no switch to turn it off, only its spring, limit and motor', () => {
        const switches = Object.keys(box2d).filter((name) => /^b2Joint_(Enable|Disable|IsEnabled)/.test(name));

        expect(switches).toEqual([]);
        expect(typeof box2d.b2RevoluteJoint_EnableMotor).toBe('function');
    });

    test('destroying a body destroys its joints', () => {
        const worldId = createWorld(NO_GRAVITY);
        const bodyA = createBoxBody(worldId, 'dynamic', { x: 0, y: 0 });
        const bodyB = createBoxBody(worldId, 'dynamic', { x: 1, y: 0 });
        const hingeId = createHinge(worldId, bodyA, bodyB);

        box2d.b2DestroyBody(bodyA);

        expect(box2d.b2Joint_IsValid(hingeId)).toBe(false);
        box2d.b2DestroyWorld(worldId);
    });

    test('a force threshold sends a joint event after the step and keeps the joint', () => {
        const defaultDefinition = box2d.b2DefaultRevoluteJointDef();
        const defaultThreshold = defaultDefinition.base.forceThreshold;
        defaultDefinition.delete();

        const worldId = createWorld(DOWN_ON_SCREEN);
        const ground = createBoxBody(worldId, 'static', { x: 0, y: 0 }, 0.1);
        const weight = createBoxBody(worldId, 'dynamic', { x: 0, y: 0 });
        const hingeId = createHinge(worldId, ground, weight, { forceThreshold: 1, userData: 7 });

        step(worldId);
        const jointEvents = box2d.b2World_GetJointEvents(worldId);
        const eventCount = jointEvents.count;
        const firstEvent = jointEvents.GetJointEvent(0);
        const eventUserData = firstEvent.userData;
        firstEvent.delete();
        jointEvents.delete();

        expect(defaultThreshold).toBeGreaterThan(1e38);
        expect(eventCount).toBe(1);
        expect(eventUserData).toBe(7);
        expect(box2d.b2Joint_IsValid(hingeId)).toBe(true);
        box2d.b2DestroyWorld(worldId);
    });
});
