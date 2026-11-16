import { Matrix2D } from '../../geometry/index.ts';

import type { BodyPose } from '../contracts/BodyPose.ts';

// A body's level matrix as play splits it once at the start: the pose Box2D moves (position and angle)
// and the rest it never changes (scale, skew and a mirror). pose · rest is the level matrix again.
export type BodySplit = {
    readonly pose: BodyPose;
    // From the body's space to level positions: the pose as a matrix.
    readonly poseMatrix: Matrix2D;
    readonly rest: Matrix2D;
};

const NO_SCALE = { x: 1, y: 1 };
const ORIGIN = { x: 0, y: 0 };

export function splitBodyMatrix(levelMatrix: Matrix2D): BodySplit {
    const values = levelMatrix.decompose();
    const pose = { x: values.position.x, y: values.position.y, angle: values.rotation };
    const poseMatrix = Matrix2D.fromTransform({
        position: values.position,
        rotation: values.rotation,
        scale: NO_SCALE,
        skew: 0,
    });
    const rest = Matrix2D.fromTransform({ position: ORIGIN, rotation: 0, scale: values.scale, skew: values.skew });

    return { pose, poseMatrix, rest };
}
