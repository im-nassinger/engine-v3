import type { BodyType } from '../../components/index.ts';
import type { EntityId } from '../../fields/index.ts';
import type {
    BodyDefinition,
    BodyHandle,
    BodyPose,
    BodyPoses,
    PhysicsEngine,
    PhysicsWorld,
} from '../../physics/index.ts';

const FALL_PER_STEP = 10;

type ScriptedBody = {
    readonly entity: EntityId;
    readonly type: BodyType;
    pose: BodyPose;
    destroyed: boolean;
};

// A PhysicsWorld where every Dynamic body falls 10 px a step and nothing else moves, unless a test sets a
// body's next pose itself. A destroyed body stops moving and is listed.
export class ScriptedWorld implements PhysicsWorld {
    static readonly FALL_PER_STEP = FALL_PER_STEP;
    readonly destroyedEntities: EntityId[] = [];
    falling = true;
    private readonly bodies: ScriptedBody[] = [];
    private readonly movedLastStep: ScriptedBody[] = [];
    private readonly nextPoses = new Map<EntityId, BodyPose>();

    createBody(definition: BodyDefinition): BodyHandle {
        const pose = { x: definition.position.x, y: definition.position.y, angle: definition.angle };
        this.bodies.push({ entity: definition.entity, type: definition.type, pose, destroyed: false });

        return this.bodies.length - 1;
    }

    setNextPose(entity: EntityId, pose: BodyPose) {
        this.nextPoses.set(entity, pose);
    }

    addSurface() {}
    createJoint() {
        return 0;
    }
    destroyJoint() {}
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
    }

    readMovedBodies(into: BodyPoses) {
        for (const body of this.movedLastStep) {
            into.recordMove(body.entity, body.pose);
        }
    }

    velocityOf() {
        return { linear: { x: 0, y: 0 }, spin: 0 };
    }

    destroyBody(handle: BodyHandle) {
        const body = this.bodies[handle];
        if (body === undefined || body.destroyed) throw new Error(`Body ${handle} can't be destroyed.`);

        body.destroyed = true;
        this.destroyedEntities.push(body.entity);
    }

    destroy() {}
}

export class ScriptedEngine implements PhysicsEngine {
    readonly world = new ScriptedWorld();

    async load() {}

    createWorld() {
        return this.world;
    }
}
