import { TransformComponent } from '../../../core/components/index.ts';
import type { Matrix2D, TransformValues } from '../../../core/geometry/index.ts';
import type { Entity } from '../../../core/level/index.ts';

// The TransformComponent values that keep an entity where it is on screen under a new parent: its level
// matrix seen from the parent's level matrix.
export function transformUnder(parentLevelMatrix: Matrix2D, entityLevelMatrix: Matrix2D) {
    const parentInverse = parentLevelMatrix.invert();
    if (parentInverse === undefined) {
        throw new Error('A parent with a scale of 0 has no inside to keep an entity in place in.');
    }

    const localMatrix = parentInverse.multiply(entityLevelMatrix);

    return localMatrix.decompose();
}

// An entity's TransformComponent values as they are now.
export function transformValuesOf(entity: Entity): TransformValues {
    const transform = entity.requireComponent(TransformComponent);

    return {
        position: transform.get('position'),
        rotation: transform.get('rotation'),
        scale: transform.get('scale'),
        skew: transform.get('skew'),
    };
}
