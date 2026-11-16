import type {
    Box2DModule,
    b2BodyId,
    b2BodyType,
    b2JointDef,
    b2JointId,
    b2ShapeDef,
    b2Transform,
    b2WorldId,
} from 'box2d3-wasm/compat';

import type { BodyType } from '../../core/components/index.ts';
import type { Point } from '../../core/geometry/index.ts';
import { DeterministicMath, Units } from '../../core/math/index.ts';
import type {
    BodyDefinition,
    BodyHandle,
    BodyPoses,
    BodyVelocity,
    HingeDefinition,
    JointDefinition,
    JointHandle,
    PhysicsWorld,
    RopeDefinition,
    SpringDefinition,
    SurfaceDefinition,
    SurfacePiece,
    WorldSettings,
} from '../../core/physics/index.ts';

const STEP_SECONDS = 1 / 60;
// Box2D's recommended number of sub-steps for one step.
const SUB_STEPS = 4;
// Box2D gives a Dynamic body without mass none at all, and it never moves. The requirements give it 1 kg.
const MASS_WITHOUT_SURFACES = 1;
// The requirements' speed cap. Spin needs no setting: Box2D 3.2 holds it to 45° a step, 7.5 turns per
// second, which is the requirements' spin cap (tech-notes.md).
const MAX_SPEED_PIXELS_PER_SECOND = 6000;

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
    // Indexed by handle, in creation order; undefined once destroyed by destroyJoint.
    private readonly joints: (b2JointId | undefined)[] = [];
    private destroyed = false;

    constructor(box2d: Box2DModule, settings: WorldSettings) {
        this.box2d = box2d;

        const worldDefinition = box2d.b2DefaultWorldDef();
        const gravity = new box2d.b2Vec2(settings.gravity.x, settings.gravity.y);
        worldDefinition.gravity = gravity;
        gravity.delete();
        worldDefinition.maximumLinearSpeed = Units.toMetres(MAX_SPEED_PIXELS_PER_SECOND);

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

    addSurface(body: BodyHandle, surface: SurfaceDefinition) {
        this.checkAlive();
        const createdBody = this.bodyAt(body);

        const shapeDefinition = this.box2d.b2DefaultShapeDef();
        // A sensor weighs nothing, so it never changes how its body moves.
        shapeDefinition.density = surface.sensor ? 0 : surface.density;
        shapeDefinition.material.friction = surface.friction;
        shapeDefinition.material.restitution = surface.restitution;
        shapeDefinition.isSensor = surface.sensor;
        shapeDefinition.userData = surface.entity;

        for (const piece of surface.pieces) {
            this.addPiece(createdBody.bodyId, shapeDefinition, piece);
        }

        shapeDefinition.delete();

        // Surfaces that weigh nothing leave a Dynamic body with no mass, and it would never move.
        if (createdBody.type === 'dynamic' && this.box2d.b2Body_GetMass(createdBody.bodyId) === 0) {
            this.giveMassWithoutSurfaces(createdBody.bodyId);
        }
    }

    createJoint(definition: JointDefinition): JointHandle {
        this.checkAlive();

        if (definition.bodyA === definition.bodyB) {
            throw new Error('A joint must join two different bodies.');
        }

        const jointId = definition.type === 'hinge' ? this.createHinge(definition) : this.createDistance(definition);
        this.joints.push(jointId);

        return this.joints.length - 1;
    }

    destroyJoint(joint: JointHandle) {
        this.checkAlive();

        const jointId = this.joints[joint];
        if (jointId === undefined) {
            throw new Error(`Joint ${joint} doesn't exist in this world.`);
        }

        // Box2D destroys a body's joints with it, and the id then reads as no longer valid.
        if (this.box2d.b2Joint_IsValid(jointId)) {
            this.box2d.b2DestroyJoint(jointId);
        }
        this.joints[joint] = undefined;
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

    velocityOf(body: BodyHandle): BodyVelocity {
        this.checkAlive();
        const bodyId = this.bodyAt(body).bodyId;

        const box2dLinear = this.box2d.b2Body_GetLinearVelocity(bodyId);
        const linear = { x: Units.toPixels(box2dLinear.x), y: Units.toPixels(box2dLinear.y) };
        box2dLinear.delete();
        const spin = Units.toDegrees(this.box2d.b2Body_GetAngularVelocity(bodyId));

        return { linear, spin };
    }

    // Not part of PhysicsWorld: the tests use it to throw and spin bodies, until scripts (v2) need it.
    setVelocity(body: BodyHandle, velocity: BodyVelocity) {
        this.checkAlive();
        const box2d = this.box2d;
        const bodyId = this.bodyAt(body).bodyId;

        const linear = new box2d.b2Vec2(Units.toMetres(velocity.linear.x), Units.toMetres(velocity.linear.y));
        box2d.b2Body_SetLinearVelocity(bodyId, linear);
        linear.delete();
        box2d.b2Body_SetAngularVelocity(bodyId, Units.toRadians(velocity.spin));
    }

    destroyBody(body: BodyHandle) {
        this.checkAlive();

        const createdBody = this.bodyAt(body);
        this.box2d.b2DestroyBody(createdBody.bodyId);
        this.bodies[body] = undefined;
    }

    destroy() {
        if (this.destroyed) return;

        this.box2d.b2DestroyWorld(this.worldId);
        this.bodies.length = 0;
        this.joints.length = 0;
        this.destroyed = true;
    }

    private checkAlive() {
        if (this.destroyed) {
            throw new Error('This physics world was destroyed.');
        }
    }

    private bodyAt(body: BodyHandle) {
        const createdBody = this.bodies[body];
        if (createdBody === undefined) {
            throw new Error(`Body ${body} doesn't exist in this world.`);
        }

        return createdBody;
    }

    // A Hinge is Box2D's revolute joint. Resistance is a motor at speed 0, which brakes the turning
    // without holding any angle.
    private createHinge(definition: HingeDefinition) {
        const box2d = this.box2d;
        const hingeDefinition = box2d.b2DefaultRevoluteJointDef();
        this.setEnds(hingeDefinition.base, definition);

        hingeDefinition.enableLimit = definition.limitRotation;
        hingeDefinition.lowerAngle = Units.toRadians(definition.minAngle);
        hingeDefinition.upperAngle = Units.toRadians(definition.maxAngle);

        if (definition.motor) {
            hingeDefinition.enableMotor = true;
            hingeDefinition.motorSpeed = Units.toRadians(definition.motorSpeed);
            hingeDefinition.maxMotorTorque = definition.motorStrength;
        } else if (definition.resistance > 0) {
            hingeDefinition.enableMotor = true;
            hingeDefinition.motorSpeed = 0;
            hingeDefinition.maxMotorTorque = definition.resistance;
        }

        const jointId = box2d.b2CreateRevoluteJoint(this.worldId, hingeDefinition);
        hingeDefinition.delete();

        return jointId;
    }

    // Rope and Spring are Box2D's distance joint with its spring on. A Rope's spring has 0 bounces per
    // second, so it pulls nothing, and its limit from 0 to Length makes it a longest distance that can go
    // slack. A Spring has no limit. Box2D takes the stiffness in bounces per second, without the mass.
    private createDistance(definition: RopeDefinition | SpringDefinition) {
        const box2d = this.box2d;
        const distanceDefinition = box2d.b2DefaultDistanceJointDef();
        this.setEnds(distanceDefinition.base, definition);
        distanceDefinition.enableSpring = true;

        if (definition.type === 'rope') {
            const length = Units.toMetres(definition.length);
            distanceDefinition.length = length;
            distanceDefinition.hertz = 0;
            distanceDefinition.dampingRatio = 0;
            distanceDefinition.enableLimit = true;
            distanceDefinition.minLength = 0;
            distanceDefinition.maxLength = length;
        } else {
            distanceDefinition.length = Units.toMetres(definition.restLength);
            distanceDefinition.hertz = definition.stiffness;
            distanceDefinition.dampingRatio = definition.damping;
            distanceDefinition.enableLimit = false;
        }

        const jointId = box2d.b2CreateDistanceJoint(this.worldId, distanceDefinition);
        distanceDefinition.delete();

        return jointId;
    }

    // Box2D turns and measures its body B against its body A, so field A is Box2D's body B and field B is
    // its body A. Each frame sits on its end; B's frame holds the angle between the two bodies at the
    // start, so a Hinge's placed angle reads 0 and its limits count from it.
    private setEnds(base: b2JointDef, definition: JointDefinition) {
        const box2d = this.box2d;
        const turningBodyId = this.bodyAt(definition.bodyA).bodyId;
        const baseBodyId = this.bodyAt(definition.bodyB).bodyId;

        base.bodyIdA = baseBodyId;
        base.bodyIdB = turningBodyId;
        base.collideConnected = definition.letConnectedObjectsCollide;
        base.userData = definition.entity;

        const baseFrame = this.localFrame(baseBodyId, definition.endB);
        base.localFrameA = baseFrame;
        baseFrame.delete();

        const turningFrame = this.localFrame(turningBodyId, definition.endA);
        const baseRotation = box2d.b2Body_GetRotation(baseBodyId);
        const turningRotation = box2d.b2Body_GetRotation(turningBodyId);
        const startAngle = box2d.b2InvMulRot(turningRotation, baseRotation);
        turningFrame.q = startAngle;
        startAngle.delete();
        baseRotation.delete();
        turningRotation.delete();
        base.localFrameB = turningFrame;
        turningFrame.delete();
    }

    // A frame on a body at a level position, turned as the body is.
    private localFrame(bodyId: b2BodyId, levelPosition: Point): b2Transform {
        const box2d = this.box2d;

        const frame = new box2d.b2Transform();
        const position = this.toBox2dPoint(levelPosition);
        const localPosition = box2d.b2Body_GetLocalPoint(bodyId, position);
        frame.p = localPosition;
        localPosition.delete();
        position.delete();
        frame.q.c = 1;
        frame.q.s = 0;

        return frame;
    }

    private addPiece(bodyId: b2BodyId, shapeDefinition: b2ShapeDef, piece: SurfacePiece) {
        switch (piece.kind) {
            case 'circle':
                this.addCircle(bodyId, shapeDefinition, piece.center, piece.radius);
                return;
            case 'polygon':
                this.addPolygon(bodyId, shapeDefinition, piece.points);
                return;
            case 'line':
                this.addLine(bodyId, shapeDefinition, piece.points);
                return;
        }
    }

    private addCircle(bodyId: b2BodyId, shapeDefinition: b2ShapeDef, center: Point, radius: number) {
        const box2d = this.box2d;

        const circle = new box2d.b2Circle();
        const box2dCenter = this.toBox2dPoint(center);
        circle.center = box2dCenter;
        box2dCenter.delete();
        circle.radius = Units.toMetres(radius);

        box2d.b2CreateCircleShape(bodyId, shapeDefinition, circle);
        circle.delete();
    }

    // Box2D builds a polygon from its hull, which also puts the points in its own order. A hull of
    // fewer than 3 points, from points too close together or in a row, has no area and is skipped.
    private addPolygon(bodyId: b2BodyId, shapeDefinition: b2ShapeDef, points: readonly Point[]) {
        const box2d = this.box2d;

        const pointsInMetres = points.map((point) => ({ x: Units.toMetres(point.x), y: Units.toMetres(point.y) }));
        const hull = box2d.b2ComputeHull(pointsInMetres);

        if (hull.count >= 3) {
            const polygon = box2d.b2MakePolygon(hull, 0);
            box2d.b2CreatePolygonShape(bodyId, shapeDefinition, polygon);
            polygon.delete();
        }

        hull.delete();
    }

    // A line is one two-sided segment per edge, not a chain: chains collide from one side only, and
    // Box2D never makes segments collide with segments, so lines never hit each other.
    private addLine(bodyId: b2BodyId, shapeDefinition: b2ShapeDef, points: readonly Point[]) {
        const box2d = this.box2d;

        for (let i = 0; i + 1 < points.length; i++) {
            const start = points[i];
            const end = points[i + 1];
            if (start === undefined || end === undefined) continue;

            const segment = new box2d.b2Segment();
            const box2dStart = this.toBox2dPoint(start);
            const box2dEnd = this.toBox2dPoint(end);
            segment.point1 = box2dStart;
            segment.point2 = box2dEnd;
            box2dStart.delete();
            box2dEnd.delete();

            box2d.b2CreateSegmentShape(bodyId, shapeDefinition, segment);
            segment.delete();
        }
    }

    private toBox2dPoint(point: Point) {
        return new this.box2d.b2Vec2(Units.toMetres(point.x), Units.toMetres(point.y));
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
