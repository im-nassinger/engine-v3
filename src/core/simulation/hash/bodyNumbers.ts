import type { EntityId } from '../../fields/index.ts';
import type { BodyPoses, PhysicsScene } from '../../physics/index.ts';

export const NUMBERS_PER_BODY = 7;

export type BodyNumbers = {
    readonly entityId: EntityId;
    // The id, position, angle, speed and spin, in that order.
    readonly numbers: readonly number[];
};

// Each body still in the run, in Entities panel order, with the numbers the hashes fold in. A removed
// body has no pose, so it is left out.
export function bodyNumbers(scene: PhysicsScene, poses: BodyPoses): BodyNumbers[] {
    const found: BodyNumbers[] = [];

    for (const body of scene.bodies) {
        const id = body.entity.id;
        const pose = poses.poseOf(id);
        if (pose === undefined) continue;

        const { linear, spin } = scene.world.velocity(body.handle);
        found.push({ entityId: id, numbers: [id, pose.x, pose.y, pose.angle, linear.x, linear.y, spin] });
    }

    return found;
}
