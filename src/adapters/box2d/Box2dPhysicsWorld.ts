import type { Box2DModule, b2BodyId, b2BodyType, b2WorldId } from 'box2d3-wasm/compat';

import type { BodyType } from '../../core/components/index.ts';
import type { Point } from '../../core/geometry/index.ts';
import { DeterministicMath, Units } from '../../core/math/index.ts';
import type { BodyDefinition, BodyHandle, BodyPoses, PhysicsWorld, WorldSettings } from '../../core/physics/index.ts';

const STEP_SECONDS = 1 / 60;
// Box2D's recommended number of sub-steps for one step.
const SUB_STEPS = 4;
// Box2D gives a Dynamic body without mass none at all, and it never moves. The requirements give it 1 kg.
const MASS_WITHOUT_SURFACES = 1;

type CreatedBody = {
    readonly bodyId: b2BodyId;
    readonly type: BodyType;
};

// One Box2D world. The only code that turns pixels into metres and degrees into radians. Box2D's angles
// turn counter-clockwise with y up, which is clockwise on screen with y down, so angles keep their sign.
// An object Box2D's bindings return from a function is a copy in wasm memory, deleted once read; one read
// from a field (a move event's transform, a definition's motion locks) is a view into its parent, never
// deleted on its own.
export class Box2dPhysicsWorld implements PhysicsWorld {
    private readonly box2d: Box2DModule;
    private readonly worldId: b2WorldId;
    // Indexed by handle, in creation order; undefined once destroyed.
    private readonly bodies: (CreatedBody | undefined)[] = [];
    private destroyed = false;

    constructor(box2d: Box2DModule, settings: WorldSettings) {
        this.box2d = box2d;

        const worldDefinition = box2d.b2DefaultWorldDef();
        const gravity = new box2d.b2Vec2(settings.gravity.x, settings.gravity.y);
        worldDefinition.gravity = gravity;
        gravity.delete();

        this.worldId = box2d.b2CreateWorld(worldDefinition);
        worldDefinition.delete();
    }

    createBody(definition: BodyDefinition) {
        this.checkAlive();
        const box2d = this.box2d;

        const bodyDefinition = box2d.b2DefaultBodyDef();
        bodyDefinition.type = this.box2dBodyType(definition.type);

        const position = new box2d.b2Vec2(Units.toMetres(definition.position.x), Units.toMetres(definition.position.y));
        bodyDefinition.position = position;
        position.delete();

        // Box2D's own b2MakeRot is off by up to 0.03°, so the rotation comes from the game's sine and cosine.
        const sineAndCosine = DeterministicMath.sinCos(definition.angle);
        bodyDefinition.rotation.c = sineAndCosine.cos;
        bodyDefinition.rotation.s = sineAndCosine.sin;

        bodyDefinition.motionLocks.angularZ = definition.fixedRotation;

        bodyDefinition.gravityScale = definition.gravityScale;
        bodyDefinition.linearDamping = definition.linearDamping;
        bodyDefinition.angularDamping = definition.angularDamping;
        bodyDefinition.isBullet = definition.bullet;
        bodyDefinition.userData = definition.entity;

        const bodyId = box2d.b2CreateBody(this.worldId, bodyDefinition);
        bodyDefinition.delete();

        if (definition.type === 'dynamic') {
            this.giveMassWithoutSurfaces(bodyId);
        }

        this.bodies.push({ bodyId, type: definition.type });

        return this.bodies.length - 1;
    }

    setGravity(gravity: Point) {
        this.checkAlive();
        const box2d = this.box2d;

        const box2dGravity = new box2d.b2Vec2(gravity.x, gravity.y);
        box2d.b2World_SetGravity(this.worldId, box2dGravity);
        box2dGravity.delete();

        // Box2D leaves sleeping bodies asleep when gravity changes.
        for (const body of this.bodies) {
            if (body === undefined || body.type === 'static') continue;

            box2d.b2Body_SetAwake(body.bodyId, true);
        }
    }

    step() {
        this.checkAlive();
        this.box2d.b2World_Step(this.worldId, STEP_SECONDS, SUB_STEPS);
    }

    readMovedBodies(into: BodyPoses) {
        this.checkAlive();

        const bodyEvents = this.box2d.b2World_GetBodyEvents(this.worldId);
        const moveCount = bodyEvents.moveCount;

        for (let i = 0; i < moveCount; i++) {
            const moveEvent = bodyEvents.GetMoveEvent(i);
            const transform = moveEvent.transform;
            const position = transform.p;
            const rotation = transform.q;

            const entity = moveEvent.userData;
            const x = Units.toPixels(position.x);
            const y = Units.toPixels(position.y);
            const angleInRadians = DeterministicMath.atan2(rotation.s, rotation.c);
            const angle = Units.toDegrees(angleInRadians);
            into.recordMove(entity, { x, y, angle });

            moveEvent.delete();
        }

        bodyEvents.delete();
    }

    destroyBody(body: BodyHandle) {
        this.checkAlive();

        const createdBody = this.bodies[body];
        if (createdBody === undefined) {
            throw new Error(`Body ${body} doesn't exist in this world.`);
        }

        this.box2d.b2DestroyBody(createdBody.bodyId);
        this.bodies[body] = undefined;
    }

    destroy() {
        if (this.destroyed) return;

        this.box2d.b2DestroyWorld(this.worldId);
        this.bodies.length = 0;
        this.destroyed = true;
    }

    private checkAlive() {
        if (this.destroyed) {
            throw new Error('This physics world was destroyed.');
        }
    }

    private box2dBodyType(type: BodyType): b2BodyType {
        const bodyTypes = this.box2d.b2BodyType;

        if (type === 'static') return bodyTypes.b2_staticBody;
        if (type === 'kinematic') return bodyTypes.b2_kinematicBody;

        return bodyTypes.b2_dynamicBody;
    }

    private giveMassWithoutSurfaces(bodyId: b2BodyId) {
        const massData = new this.box2d.b2MassData();
        massData.mass = MASS_WITHOUT_SURFACES;
        this.box2d.b2Body_SetMassData(bodyId, massData);
        massData.delete();
    }
}
