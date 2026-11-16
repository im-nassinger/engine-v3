import type { Point } from '../../geometry/index.ts';

import type { BodyDefinition } from './BodyDefinition.ts';
import type { BodyPoses } from './BodyPoses.ts';

// The physics world's own number for a body. It means nothing outside the world that gave it.
export type BodyHandle = number;

// One run's physics. Everything going in and out is in pixels and degrees, except gravity, which is in
// m/s² like the World's Gravity field. Surfaces come with stage 13's step 3 and joints with stage 14.
export type PhysicsWorld = {
    createBody(definition: BodyDefinition): BodyHandle;
    // Wakes every body, so a sleeping one feels the new gravity.
    setGravity(gravity: Point): void;
    // One step of 1/60 s.
    step(): void;
    // Records the pose of each body that moved in the last step.
    readMovedBodies(into: BodyPoses): void;
    destroyBody(body: BodyHandle): void;
    destroy(): void;
};
