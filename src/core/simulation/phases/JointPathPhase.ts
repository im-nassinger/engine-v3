import { PathComponent } from '../../components/index.ts';
import type { EntityId } from '../../fields/index.ts';
import type { Point } from '../../geometry/index.ts';
import { jointPathPoints } from '../../physics/index.ts';

import type { PlayJoint, PlayJointEnd } from '../joints/PlayJoints.ts';
import type { PlayRun } from '../run/PlayRun.ts';
import type { TickContext, TickPhase } from '../run/TickPhase.ts';

// Keeps each Rope and Spring's read-only path on its two ends, worked out from its bodies' poses. A path
// changes only when one of its bodies moved this tick, and only a path that changed goes in the report.
export class JointPathPhase implements TickPhase {
    run(tick: TickContext) {
        const { run } = tick;
        const moved = new Set<EntityId>(run.poses.moved);
        if (moved.size === 0) return;

        for (const joint of run.joints.all) {
            if (!hasMovedEnd(joint, moved)) continue;

            updatePath(run, joint);
        }
    }
}

function hasMovedEnd(joint: PlayJoint, moved: ReadonlySet<EntityId>) {
    const movedA = joint.endA.body !== undefined && moved.has(joint.endA.body.id);
    const movedB = joint.endB.body !== undefined && moved.has(joint.endB.body.id);

    return movedA || movedB;
}

function updatePath(run: PlayRun, joint: PlayJoint) {
    if (joint.type === 'hinge') return;

    const path = joint.entity.getComponent(PathComponent);
    if (path === undefined) return;

    const jointMatrix = run.caches.worldMatrices.matrixOf(joint.entity);
    const toJoint = jointMatrix.invert();
    if (toJoint === undefined) return;

    const endALevel = levelPositionOf(run, joint.endA);
    const endBLevel = levelPositionOf(run, joint.endB);
    if (endALevel === undefined || endBLevel === undefined) return;

    const endA = toJoint.apply(endALevel);
    const endB = toJoint.apply(endBLevel);
    const newPath = jointPathPoints(joint.type, endA, endB);

    const before = path.get('path');
    const stored = path.set('path', newPath);
    // set gives back the value it already held when nothing changed.
    if (stored === before) return;

    run.report.pathChanged(joint.entity.id, stored);
}

function levelPositionOf(run: PlayRun, end: PlayJointEnd): Point | undefined {
    if (end.body === undefined) return end.position;

    const pose = run.bodyMatrices.poseMatrixOf(end.body);

    return pose?.apply(end.position);
}
