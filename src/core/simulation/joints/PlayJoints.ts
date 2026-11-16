import { JointComponent } from '../../components/index.ts';
import type { JointType } from '../../components/index.ts';
import type { WorldMatrixCache } from '../../derived/index.ts';
import type { Point } from '../../geometry/index.ts';
import type { Entity } from '../../level/index.ts';
import type { JointHandle, SceneJoint } from '../../physics/index.ts';

import type { BodyMatrices } from '../bodies/BodyMatrices.ts';

// One end of a joint in play: the body it moves with, undefined for the ground, and where it sits in that
// body's space, or in level positions on the ground.
export type PlayJointEnd = {
    readonly body: Entity | undefined;
    readonly position: Point;
};

// One joint play built, with its two ends worked out once at the start, so its path follows its bodies'
// poses without asking the physics world.
export type PlayJoint = {
    readonly entity: Entity;
    readonly handle: JointHandle;
    readonly type: JointType;
    readonly endA: PlayJointEnd;
    readonly endB: PlayJointEnd;
};

// The joints still in the run, in Entities panel order.
export class PlayJoints {
    private readonly joints = new Map<Entity, PlayJoint>();

    // Reads each joint's level matrix and its bodies' poses, so call it before the first tick.
    static fromScene(sceneJoints: readonly SceneJoint[], worldMatrices: WorldMatrixCache, bodyMatrices: BodyMatrices) {
        const playJoints = new PlayJoints();

        for (const sceneJoint of sceneJoints) {
            const joint = sceneJoint.entity.requireComponent(JointComponent);
            const type = joint.get('type');
            const ends = joint.get('ends');
            // A Hinge has one end, which both bodies share.
            let endBInJoint = ends.b;
            if (type === 'hinge') {
                endBInJoint = ends.a;
            }

            const levelMatrix = worldMatrices.matrixOf(sceneJoint.entity);
            const endALevel = levelMatrix.apply(ends.a);
            const endBLevel = levelMatrix.apply(endBInJoint);
            const endA = endOf(sceneJoint.bodyA, endALevel, bodyMatrices);
            const endB = endOf(sceneJoint.bodyB, endBLevel, bodyMatrices);

            playJoints.joints.set(sceneJoint.entity, {
                entity: sceneJoint.entity,
                handle: sceneJoint.handle,
                type,
                endA,
                endB,
            });
        }

        return playJoints;
    }

    get all(): Iterable<PlayJoint> {
        return this.joints.values();
    }

    // The joints with an end on one of the bodies, in Entities panel order.
    attachedToAny(bodies: ReadonlySet<Entity>) {
        const attached: PlayJoint[] = [];

        for (const joint of this.joints.values()) {
            if (isAttachedToAny(joint, bodies)) {
                attached.push(joint);
            }
        }

        return attached;
    }

    find(entity: Entity) {
        return this.joints.get(entity);
    }

    remove(joint: PlayJoint) {
        this.joints.delete(joint.entity);
    }
}

function endOf(body: Entity | undefined, levelPosition: Point, bodyMatrices: BodyMatrices): PlayJointEnd {
    if (body === undefined) return { body, position: levelPosition };

    const poseMatrix = bodyMatrices.poseMatrixOf(body);
    const fromLevel = poseMatrix?.invert();
    if (fromLevel === undefined) throw new Error(`Entity ${body.id} is not a body in this run.`);

    return { body, position: fromLevel.apply(levelPosition) };
}

function isAttachedToAny(joint: PlayJoint, bodies: ReadonlySet<Entity>) {
    const onA = joint.endA.body !== undefined && bodies.has(joint.endA.body);
    const onB = joint.endB.body !== undefined && bodies.has(joint.endB.body);

    return onA || onB;
}
