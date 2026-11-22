import type {
    Box2DModule,
    b2BodyId,
    b2BodyType,
    b2JointDef,
    b2JointId,
    b2ShapeDef,
    b2ShapeId,
    b2Transform,
    b2WorldId,
} from 'box2d3-wasm/compat';

import type { BodyType } from '../../core/components/index.ts';
import type { Point } from '../../core/geometry/index.ts';
import type { EntityId } from '../../core/fields/index.ts';
import { DeterministicMath, Units } from '../../core/math/index.ts';
import type {
    BodyDefinition,
    BodyHandle,
    BodyPose,
    BodyPoses,
    BodyVelocity,
    HingeDefinition,
    HingeMotor,
    JointDefinition,
    JointHandle,
    PhysicsWorld,
    RopeDefinition,
    SensorEvent,
    SpringDefinition,
    SurfaceDefinition,
    SurfacePiece,
    SurfaceSettings,
    WorldSettings,
} from '../../core/physics/index.ts';

import { SensorShapeTable } from './SensorShapeTable.ts';

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
    readonly entity: EntityId;
    readonly surfaces: CreatedSurface[];
};

// One addSurface call: what it was given, so a change of Sensor can build it again, and the shapes made.
type CreatedSurface = {
    definition: SurfaceDefinition;
    shapes: b2ShapeId[];
};

type CreatedJoint = {
    readonly jointId: b2JointId;
    readonly type: JointDefinition['type'];
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
    private readonly joints: (CreatedJoint | undefined)[] = [];
    // Every surface an entity gave, in the order given. The World gives one per wall.
    private readonly surfacesByEntity = new Map<EntityId, { body: CreatedBody; surface: CreatedSurface }[]>();
    private readonly sensorShapes = new SensorShapeTable();
    private readonly sensorEvents: SensorEvent[] = [];
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

        this.bodies.push({ bodyId, type: definition.type, entity: definition.entity, surfaces: [] });

        return this.bodies.length - 1;
    }

    addSurface(body: BodyHandle, surface: SurfaceDefinition) {
        this.checkAlive();
        const createdBody = this.bodyAt(body);

        const createdSurface = { definition: surface, shapes: this.createShapes(createdBody, surface) };
        createdBody.surfaces.push(createdSurface);

        const entitySurfaces = this.surfacesByEntity.get(surface.entity);
        const entry = { body: createdBody, surface: createdSurface };
        if (entitySurfaces === undefined) {
            this.surfacesByEntity.set(surface.entity, [entry]);
        } else {
            entitySurfaces.push(entry);
        }
    }

    setSurfaceSettings(entity: EntityId, settings: SurfaceSettings) {
        this.checkAlive();

        for (const { body, surface } of this.surfacesByEntity.get(entity) ?? []) {
            const definition = { ...surface.definition, ...settings };
            const sensorChanged = settings.sensor !== surface.definition.sensor;
            surface.definition = definition;

            if (sensorChanged) {
                this.destroyShapes(surface.shapes);
                surface.shapes = this.createShapes(body, definition);
                continue;
            }

            for (const shapeId of surface.shapes) {
                this.box2d.b2Shape_SetFriction(shapeId, settings.friction);
                this.box2d.b2Shape_SetRestitution(shapeId, settings.restitution);
            }
        }
    }

    createJoint(definition: JointDefinition): JointHandle {
        this.checkAlive();

        if (definition.bodyA === definition.bodyB) {
            throw new Error('A joint must join two different bodies.');
        }

        const jointId = definition.type === 'hinge' ? this.createHinge(definition) : this.createDistance(definition);
        this.joints.push({ jointId, type: definition.type });

        return this.joints.length - 1;
    }

    destroyJoint(joint: JointHandle) {
        this.checkAlive();

        const { jointId } = this.jointAt(joint);

        // Box2D destroys a body's joints with it, and the id then reads as no longer valid.
        if (this.box2d.b2Joint_IsValid(jointId)) {
            this.box2d.b2DestroyJoint(jointId);
        }
        this.joints[joint] = undefined;
    }

    setMotor(joint: JointHandle, motor: HingeMotor) {
        this.checkAlive();
        const box2d = this.box2d;

        const createdJoint = this.jointAt(joint);
        if (createdJoint.type !== 'hinge') {
            throw new Error(`Joint ${joint} is a ${createdJoint.type}, which has no motor.`);
        }

        const { jointId } = createdJoint;
        if (!box2d.b2Joint_IsValid(jointId)) return;

        const settings = this.motorSettings(motor);
        box2d.b2RevoluteJoint_EnableMotor(jointId, settings.enabled);
        box2d.b2RevoluteJoint_SetTargetMotorSpeed(jointId, settings.speed);
        box2d.b2RevoluteJoint_SetMaxMotorTorque(jointId, settings.torque);
        box2d.b2Joint_WakeBodies(jointId);
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

    // Reads the step's sensor events at once, so the table counts every one even if no one asks for them.
    step() {
        this.checkAlive();
        this.box2d.b2World_Step(this.worldId, STEP_SECONDS, SUB_STEPS);

        this.sensorEvents.length = 0;
        const sensorEvents = this.box2d.b2World_GetSensorEvents(this.worldId);
        this.sensorShapes.read(sensorEvents, this.sensorEvents);
        sensorEvents.delete();
    }

    readSensorEvents(into: SensorEvent[]) {
        this.checkAlive();
        into.push(...this.sensorEvents);
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

    setPose(body: BodyHandle, pose: BodyPose) {
        this.checkAlive();
        const box2d = this.box2d;
        const createdBody = this.bodyAt(body);

        const position = this.toBox2dPoint(pose);
        const rotation = new box2d.b2Rot();
        const sineAndCosine = DeterministicMath.sinCos(pose.angle);
        rotation.c = sineAndCosine.cos;
        rotation.s = sineAndCosine.sin;
        box2d.b2Body_SetTransform(createdBody.bodyId, position, rotation);
        rotation.delete();
        position.delete();

        if (createdBody.type !== 'static') {
            box2d.b2Body_SetAwake(createdBody.bodyId, true);
        }
    }

    addVelocity(body: BodyHandle, velocity: Point) {
        this.checkAlive();
        const box2d = this.box2d;
        const createdBody = this.bodyAt(body);
        if (createdBody.type === 'static') return;

        const bodyId = createdBody.bodyId;
        const current = box2d.b2Body_GetLinearVelocity(bodyId);
        const sum = new box2d.b2Vec2(current.x + Units.toMetres(velocity.x), current.y + Units.toMetres(velocity.y));
        current.delete();
        box2d.b2Body_SetLinearVelocity(bodyId, sum);
        sum.delete();
        box2d.b2Body_SetAwake(bodyId, true);
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

        for (const surface of createdBody.surfaces) {
            for (const shapeId of surface.shapes) {
                this.sensorShapes.markDestroyed(shapeId);
            }
            surface.shapes = [];
        }
    }

    destroy() {
        if (this.destroyed) return;

        this.box2d.b2DestroyWorld(this.worldId);
        this.bodies.length = 0;
        this.joints.length = 0;
        this.surfacesByEntity.clear();
        this.sensorShapes.clear();
        this.sensorEvents.length = 0;
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

    private jointAt(joint: JointHandle) {
        const createdJoint = this.joints[joint];
        if (createdJoint === undefined) {
            throw new Error(`Joint ${joint} doesn't exist in this world.`);
        }

        return createdJoint;
    }

    // Every shape gets sensor events, the sensor to send them and the visitor to be seen (tech-notes.md).
    private createShapes(body: CreatedBody, surface: SurfaceDefinition) {
        const shapeDefinition = this.box2d.b2DefaultShapeDef();
        // A sensor weighs nothing, so it never changes how its body moves.
        shapeDefinition.density = surface.sensor ? 0 : surface.density;
        shapeDefinition.material.friction = surface.friction;
        shapeDefinition.material.restitution = surface.restitution;
        shapeDefinition.isSensor = surface.sensor;
        shapeDefinition.enableSensorEvents = true;
        shapeDefinition.userData = surface.entity;

        const shapes: b2ShapeId[] = [];
        for (const piece of surface.pieces) {
            shapes.push(...this.addPiece(body.bodyId, shapeDefinition, piece));
        }
        shapeDefinition.delete();

        for (const shapeId of shapes) {
            this.sensorShapes.add(shapeId, surface.entity, body.entity, surface.sensor);
        }

        this.keepMass(body);

        return shapes;
    }

    private destroyShapes(shapes: readonly b2ShapeId[]) {
        for (const shapeId of shapes) {
            this.box2d.b2DestroyShape(shapeId, true);
            this.sensorShapes.markDestroyed(shapeId);
        }
    }

    // Surfaces that weigh nothing leave a Dynamic body with no mass, and it would never move.
    private keepMass(body: CreatedBody) {
        if (body.type === 'dynamic' && this.box2d.b2Body_GetMass(body.bodyId) === 0) {
            this.giveMassWithoutSurfaces(body.bodyId);
        }
    }

    // A Hinge is Box2D's revolute joint. Resistance is a motor at speed 0, which brakes the turning
    // without holding any angle.
    private motorSettings(motor: HingeMotor) {
        if (motor.motor) {
            return { enabled: true, speed: Units.toRadians(motor.motorSpeed), torque: motor.motorStrength };
        }

        return { enabled: motor.resistance > 0, speed: 0, torque: motor.resistance };
    }

    private createHinge(definition: HingeDefinition) {
        const box2d = this.box2d;
        const hingeDefinition = box2d.b2DefaultRevoluteJointDef();
        this.setEnds(hingeDefinition.base, definition);

        hingeDefinition.enableLimit = definition.limitRotation;
        hingeDefinition.lowerAngle = Units.toRadians(definition.minAngle);
        hingeDefinition.upperAngle = Units.toRadians(definition.maxAngle);

        const motor = this.motorSettings(definition);
        hingeDefinition.enableMotor = motor.enabled;
        hingeDefinition.motorSpeed = motor.speed;
        hingeDefinition.maxMotorTorque = motor.torque;

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

    // Returns the shapes made: one per circle or polygon, none for a skipped polygon, one per line edge.
    private addPiece(bodyId: b2BodyId, shapeDefinition: b2ShapeDef, piece: SurfacePiece): b2ShapeId[] {
        switch (piece.kind) {
            case 'circle':
                return [this.addCircle(bodyId, shapeDefinition, piece.center, piece.radius)];
            case 'polygon':
                return this.addPolygon(bodyId, shapeDefinition, piece.points);
            case 'line':
                return this.addLine(bodyId, shapeDefinition, piece.points);
        }
    }

    private addCircle(bodyId: b2BodyId, shapeDefinition: b2ShapeDef, center: Point, radius: number) {
        const box2d = this.box2d;

        const circle = new box2d.b2Circle();
        const box2dCenter = this.toBox2dPoint(center);
        circle.center = box2dCenter;
        box2dCenter.delete();
        circle.radius = Units.toMetres(radius);

        const shapeId = box2d.b2CreateCircleShape(bodyId, shapeDefinition, circle);
        circle.delete();

        return shapeId;
    }

    // Box2D builds a polygon from its hull, which also puts the points in its own order. A hull of
    // fewer than 3 points, from points too close together or in a row, has no area and is skipped.
    private addPolygon(bodyId: b2BodyId, shapeDefinition: b2ShapeDef, points: readonly Point[]) {
        const box2d = this.box2d;

        const pointsInMetres = points.map((point) => ({ x: Units.toMetres(point.x), y: Units.toMetres(point.y) }));
        const hull = box2d.b2ComputeHull(pointsInMetres);
        const shapes: b2ShapeId[] = [];

        if (hull.count >= 3) {
            const polygon = box2d.b2MakePolygon(hull, 0);
            shapes.push(box2d.b2CreatePolygonShape(bodyId, shapeDefinition, polygon));
            polygon.delete();
        }

        hull.delete();

        return shapes;
    }

    // A line is one two-sided segment per edge, not a chain: chains collide from one side only, and
    // Box2D never makes segments collide with segments, so lines never hit each other.
    private addLine(bodyId: b2BodyId, shapeDefinition: b2ShapeDef, points: readonly Point[]) {
        const box2d = this.box2d;
        const shapes: b2ShapeId[] = [];

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

            shapes.push(box2d.b2CreateSegmentShape(bodyId, shapeDefinition, segment));
            segment.delete();
        }

        return shapes;
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
