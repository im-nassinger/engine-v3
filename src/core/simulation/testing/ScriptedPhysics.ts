import type { BodyType } from '../../components/index.ts';
import type { EntityId } from '../../fields/index.ts';
import type { Point } from '../../geometry/index.ts';
import type {
    BodyDefinition,
    BodyHandle,
    BodyPose,
    BodyPoses,
    HingeMotor,
    JointHandle,
    PhysicsEngine,
    PhysicsWorld,
    SensorEvent,
    SurfaceSettings,
} from '../../physics/index.ts';

const FALL_PER_STEP = 10;

type ScriptedBody = {
    readonly entity: EntityId;
    readonly type: BodyType;
    pose: BodyPose;
    destroyed: boolean;
};

// What a ScriptedWorld was told to change, in order.
export type ScriptedChange =
    | { readonly call: 'setPose'; readonly entity: EntityId; readonly pose: BodyPose }
    | { readonly call: 'addVelocity'; readonly entity: EntityId; readonly velocity: Point }
    | { readonly call: 'setSurfaceSettings'; readonly entity: EntityId; readonly settings: SurfaceSettings }
    | { readonly call: 'setMotor'; readonly joint: JointHandle; readonly motor: HingeMotor };

// A PhysicsWorld where every Dynamic body falls 10 px a step and nothing else moves, unless a test sets a
// body's next pose itself. A destroyed body stops moving and is listed, and so is a destroyed joint. The
// sensor events a test queues come out of the next step; every change asked of it is listed, and setPose
// moves the body at once.
export class ScriptedWorld implements PhysicsWorld {
    static readonly FALL_PER_STEP = FALL_PER_STEP;
    readonly destroyedEntities: EntityId[] = [];
    readonly destroyedJoints: JointHandle[] = [];
    readonly changes: ScriptedChange[] = [];
    falling = true;
    private readonly bodies: ScriptedBody[] = [];
    private readonly movedLastStep: ScriptedBody[] = [];
    private readonly nextPoses = new Map<EntityId, BodyPose>();
    private jointCount = 0;
    private queuedSensorEvents: SensorEvent[] = [];
    private lastSensorEvents: SensorEvent[] = [];

    createBody(definition: BodyDefinition): BodyHandle {
        const pose = { x: definition.position.x, y: definition.position.y, angle: definition.angle };
        this.bodies.push({ entity: definition.entity, type: definition.type, pose, destroyed: false });

        return this.bodies.length - 1;
    }

    setNextPose(entity: EntityId, pose: BodyPose) {
        this.nextPoses.set(entity, pose);
    }

    queueSensorEvents(events: readonly SensorEvent[]) {
        this.queuedSensorEvents.push(...events);
    }

    addSurface() {}
    createJoint(): JointHandle {
        this.jointCount += 1;

        return this.jointCount - 1;
    }

    destroyJoint(joint: JointHandle) {
        this.destroyedJoints.push(joint);
    }

    setGravity() {}

    step() {
        this.movedLastStep.length = 0;

        for (const body of this.bodies) {
            if (body.destroyed) continue;

            const nextPose = this.nextPoses.get(body.entity);
            const falls = this.falling && body.type === 'dynamic';

            if (nextPose !== undefined) {
                body.pose = nextPose;
            } else if (falls) {
                body.pose = { ...body.pose, y: body.pose.y + FALL_PER_STEP };
            } else {
                continue;
            }
            this.movedLastStep.push(body);
        }
        this.nextPoses.clear();

        this.lastSensorEvents = this.queuedSensorEvents;
        this.queuedSensorEvents = [];
    }

    readMovedBodies(into: BodyPoses) {
        for (const body of this.movedLastStep) {
            into.recordMove(body.entity, body.pose);
        }
    }

    readSensorEvents(into: SensorEvent[]) {
        into.push(...this.lastSensorEvents);
    }

    velocityOf() {
        return { linear: { x: 0, y: 0 }, spin: 0 };
    }

    setPose(handle: BodyHandle, pose: BodyPose) {
        const body = this.requireBody(handle);
        body.pose = pose;
        this.changes.push({ call: 'setPose', entity: body.entity, pose });
    }

    addVelocity(handle: BodyHandle, velocity: Point) {
        this.changes.push({ call: 'addVelocity', entity: this.requireBody(handle).entity, velocity });
    }

    setSurfaceSettings(entity: EntityId, settings: SurfaceSettings) {
        this.changes.push({ call: 'setSurfaceSettings', entity, settings });
    }

    setMotor(joint: JointHandle, motor: HingeMotor) {
        this.changes.push({ call: 'setMotor', joint, motor });
    }

    destroyBody(handle: BodyHandle) {
        const body = this.bodies[handle];
        if (body === undefined || body.destroyed) throw new Error(`Body ${handle} can't be destroyed.`);

        body.destroyed = true;
        this.destroyedEntities.push(body.entity);
    }

    destroy() {}

    private requireBody(handle: BodyHandle) {
        const body = this.bodies[handle];
        if (body === undefined || body.destroyed) throw new Error(`Body ${handle} doesn't exist.`);

        return body;
    }
}

export class ScriptedEngine implements PhysicsEngine {
    readonly world = new ScriptedWorld();

    async load() {}

    createWorld() {
        return this.world;
    }
}
