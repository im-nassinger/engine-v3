import { Matrix2D } from '../../geometry/index.ts';
import type { BodyMatrixSource } from '../../derived/index.ts';
import type { EntityId } from '../../fields/index.ts';
import type { Entity } from '../../level/index.ts';
import type { BodyPoses, SceneBody } from '../../physics/index.ts';

const NO_SCALE = { x: 1, y: 1 };

// The play copy's body matrices: each body entity's level matrix is its current pose times the rest
// split off at the start, so children follow the body through WorldMatrixCache as usual.
export class BodyMatrices implements BodyMatrixSource {
    private readonly poses: BodyPoses;
    private readonly restsByEntity = new Map<Entity, Matrix2D>();
    private readonly entitiesById = new Map<EntityId, Entity>();

    constructor(poses: BodyPoses) {
        this.poses = poses;
    }

    add(body: SceneBody) {
        this.restsByEntity.set(body.entity, body.rest);
        this.entitiesById.set(body.entity.id, body.entity);
    }

    entityOf(id: EntityId) {
        return this.entitiesById.get(id);
    }

    matrixOf(entity: Entity) {
        const rest = this.restsByEntity.get(entity);
        if (rest === undefined) return undefined;

        const pose = this.poses.poseOf(entity.id);
        if (pose === undefined) return undefined;

        const position = { x: pose.x, y: pose.y };
        const poseMatrix = Matrix2D.fromTransform({ position, rotation: pose.angle, scale: NO_SCALE, skew: 0 });

        return poseMatrix.multiply(rest);
    }
}
