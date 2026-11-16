import type { EntityId } from '../../fields/index.ts';
import type { BodyPoses, PhysicsScene } from '../../physics/index.ts';

import { bodyNumbers } from './bodyNumbers.ts';
import { fnv1a } from './fnv1a.ts';

export type BodyHash = {
    readonly entityId: EntityId;
    readonly hash: string;
};

// One hash per body still in the run, in Entities panel order, over the same numbers stateHash folds in.
// When two runs' stateHash differ, these name the first body that differs.
export function bodyHashes(scene: PhysicsScene, poses: BodyPoses): BodyHash[] {
    return bodyNumbers(scene, poses).map((body) => ({
        entityId: body.entityId,
        hash: fnv1a(Float64Array.from(body.numbers)),
    }));
}
