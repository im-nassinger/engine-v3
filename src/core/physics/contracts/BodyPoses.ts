import type { EntityId } from '../../fields/index.ts';

import type { BodyPose } from './BodyPose.ts';

// Every body's latest pose, by its entity, and which bodies moved in the last step, in the order the
// physics world reported them. The simulation clears the moved list before each step.
export class BodyPoses {
    private readonly posesByEntity = new Map<EntityId, BodyPose>();
    private readonly movedEntities: EntityId[] = [];

    get moved(): readonly EntityId[] {
        return this.movedEntities;
    }

    // Sets a pose without counting it as a move, for a body's pose before the first step.
    place(entity: EntityId, pose: BodyPose) {
        this.posesByEntity.set(entity, pose);
    }

    recordMove(entity: EntityId, pose: BodyPose) {
        this.posesByEntity.set(entity, pose);
        this.movedEntities.push(entity);
    }

    poseOf(entity: EntityId) {
        return this.posesByEntity.get(entity);
    }

    clearMoved() {
        this.movedEntities.length = 0;
    }

    forget(entity: EntityId) {
        this.posesByEntity.delete(entity);
    }
}
