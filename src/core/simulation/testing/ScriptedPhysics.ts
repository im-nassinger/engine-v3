import type { BodyType } from '../../components/index.ts';
import type { EntityId } from '../../fields/index.ts';
import type { Point } from '../../geometry/index.ts';
import type {
    BodyDefinition,
    BodyHandle,
    BodyPose,
    BodyPoses,
    ContactEvent,
    HingeMotor,
    JointHandle,
    PhysicsEngine,
    PhysicsWorld,
    SensorEvent,
    SurfaceSettings,
    WorldSettings,
} from '../../physics/index.ts';

const FALL_PER_STEP = 10;
const STEPS_PER_SECOND = 60;

type ScriptedBody = {
    readonly entity: EntityId;
    readonly type: BodyType;
    pose: BodyPose;
    // How far it moved in the last step, which velocity() gives per second.
    moved: BodyPose;
    destroyed: boolean;
};

// What a ScriptedWorld was told to change, in order.
export type ScriptedChange =
    | { readonly call: 'setPose'; readonly entity: EntityId; readonly pose: BodyPose }
    | { readonly call: 'addVelocity'; readonly entity: EntityId; readonly velocity: Point }
    | { readonly call: 'setLinearVelocity'; readonly entity: EntityId; readonly velocity: Point }
    | { readonly call: 'setSurfaceSettings'; readonly entity: EntityId; readonly settings: SurfaceSettings }
    | { readonly call: 'setMotor'; readonly joint: JointHandle; readonly motor: HingeMotor }
    | { readonly call: 'setGravity'; readonly gravity: Point };

// A PhysicsWorld where every Dynamic body falls 10 px a step (600 px/s) and nothing else moves, unless a test sets a
// body's next pose itself. A destroyed body stops moving and is listed, and so is a destroyed joint. The
// sensor and contact events a test queues come out of the next step; every change asked of it is listed, and setPose
// moves the body at once.
export class ScriptedWorld implements PhysicsWorld {
    static readonly FALL_PER_STEP = FALL_PER_STEP;
    readonly destroyedEntities: EntityId[] = [];
    // The entities whose surfaces were taken out, in order, whether or not they had any.
    readonly removedSurfaces: EntityId[] = [];
    readonly destroyedJoints: JointHandle[] = [];
    readonly changes: ScriptedChange[] = [];
    falling = true;
    private readonly bodies: ScriptedBody[] = [];
    private readonly movedLastStep: ScriptedBody[] = [];
    private readonly nextPoses = new Map<EntityId, BodyPose>();
    private jointCount = 0;
    private queuedSensorEvents: SensorEvent[] = [];
    private lastSensorEvents: SensorEvent[] = [];
    private queuedContactEvents: ContactEvent[] = [];
    private lastContactEvents: ContactEvent[] = [];

    createBody(definition: BodyDefinition): BodyHandle {
        const pose = { x: definition.position.x, y: definition.position.y, angle: definition.angle };
        const moved = { x: 0, y: 0, angle: 0 };
        this.bodies.push({ entity: definition.entity, type: definition.type, pose, moved, destroyed: false });

        return this.bodies.length - 1;
    }

    setNextPose(entity: EntityId, pose: BodyPose) {
        this.nextPoses.set(entity, pose);
    }

    queueSensorEvents(events: readonly SensorEvent[]) {
        this.queuedSensorEvents.push(...events);
    }

    queueContactEvents(events: readonly ContactEvent[]) {
        this.queuedContactEvents.push(...events);
    }

    addSurface() {}
    createJoint(): JointHandle {
        this.jointCount += 1;

        return this.jointCount - 1;
    }

    destroyJoint(joint: JointHandle) {
        this.destroyedJoints.push(joint);
    }

    setGravity(gravity: Point) {
        this.changes.push({ call: 'setGravity', gravity });
    }

    step() {
        this.movedLastStep.length = 0;

        for (const body of this.bodies) {
            if (body.destroyed) continue;

            const before = body.pose;
            body.moved = { x: 0, y: 0, angle: 0 };
            const nextPose = this.nextPoses.get(body.entity);
            const falls = this.falling && body.type === 'dynamic';

            if (nextPose !== undefined) {
                body.pose = nextPose;
            } else if (falls) {
                body.pose = { ...body.pose, y: body.pose.y + FALL_PER_STEP };
            } else {
                continue;
            }
            body.moved = {
                x: body.pose.x - before.x,
                y: body.pose.y - before.y,
                angle: body.pose.angle - before.angle,
            };
            this.movedLastStep.push(body);
        }
        this.nextPoses.clear();

        this.lastSensorEvents = this.queuedSensorEvents;
        this.queuedSensorEvents = [];
        this.lastContactEvents = this.queuedContactEvents;
        this.queuedContactEvents = [];
    }

    readMovedBodies(into: BodyPoses) {
        for (const body of this.movedLastStep) {
            into.recordMove(body.entity, body.pose);
        }
    }

    readSensorEvents(into: SensorEvent[]) {
        into.push(...this.lastSensorEvents);
    }

    contactEvents(): readonly ContactEvent[] {
        return this.lastContactEvents;
    }

    // What the body moved in the last step, as if it moved that way all along it: 60 steps a second.
    velocity(handle: BodyHandle) {
        const { moved } = this.requireBody(handle);

        return {
            linear: { x: moved.x * STEPS_PER_SECOND, y: moved.y * STEPS_PER_SECOND },
            spin: moved.angle * STEPS_PER_SECOND,
        };
    }

    setPose(handle: BodyHandle, pose: BodyPose) {
        const body = this.requireBody(handle);
        body.pose = pose;
        this.changes.push({ call: 'setPose', entity: body.entity, pose });
    }

    addVelocity(handle: BodyHandle, velocity: Point) {
        this.changes.push({ call: 'addVelocity', entity: this.requireBody(handle).entity, velocity });
    }

    setLinearVelocity(handle: BodyHandle, velocity: Point) {
        this.changes.push({ call: 'setLinearVelocity', entity: this.requireBody(handle).entity, velocity });
    }

    setSurfaceSettings(entity: EntityId, settings: SurfaceSettings) {
        this.changes.push({ call: 'setSurfaceSettings', entity, settings });
    }

    setMotor(joint: JointHandle, motor: HingeMotor) {
        this.changes.push({ call: 'setMotor', joint, motor });
    }

    removeSurfaces(entity: EntityId) {
        this.removedSurfaces.push(entity);
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

// Keeps the settings its one world was made with, so a test can see which surfaces send contact events.
export class ScriptedEngine implements PhysicsEngine {
    readonly world = new ScriptedWorld();
    settings: WorldSettings | undefined;

    async load() {}

    createWorld(settings: WorldSettings) {
        this.settings = settings;

        return this.world;
    }
}
