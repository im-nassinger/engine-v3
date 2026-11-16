import type { Matrix2D } from '../../geometry/index.ts';
import type { Entity } from '../../level/index.ts';

// During play, a body entity's level matrix comes from its body's pose, not from its TransformComponent
// and its parents. undefined for every entity that isn't a body play built.
export type BodyMatrixSource = {
    matrixOf(entity: Entity): Matrix2D | undefined;
};
