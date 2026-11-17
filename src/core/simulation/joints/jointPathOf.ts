import type { WorldMatrixCache } from '../../derived/index.ts';
import type { PathGeometry, Point } from '../../geometry/index.ts';
import { jointPathPoints } from '../../physics/index.ts';

import type { BodyMatrices } from '../bodies/BodyMatrices.ts';

import type { PlayJoint, PlayJointEnd } from './PlayJoints.ts';

// A Rope or Spring's path between its two ends where its bodies are now, in the joint's own space. Undefined
// for a Hinge, which has no path, or when an end's body is no longer in the run. JointPathPhase and the
// page's PlayMirror both use it, so the mirror draws the same path as the play copy holds.
export function jointPathOf(
    joint: PlayJoint,
    worldMatrices: WorldMatrixCache,
    bodyMatrices: BodyMatrices,
): PathGeometry | undefined {
    if (joint.type === 'hinge') return undefined;

    const toJoint = worldMatrices.matrixOf(joint.entity).invert();
    if (toJoint === undefined) return undefined;

    const endALevel = levelPositionOf(joint.endA, bodyMatrices);
    const endBLevel = levelPositionOf(joint.endB, bodyMatrices);
    if (endALevel === undefined || endBLevel === undefined) return undefined;

    return jointPathPoints(joint.type, toJoint.apply(endALevel), toJoint.apply(endBLevel));
}

function levelPositionOf(end: PlayJointEnd, bodyMatrices: BodyMatrices): Point | undefined {
    if (end.body === undefined) return end.position;

    const pose = bodyMatrices.poseMatrixOf(end.body);

    return pose?.apply(end.position);
}
