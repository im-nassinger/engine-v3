import type { Point } from '../../geometry/index.ts';

import type { BodyDefinition } from './BodyDefinition.ts';
import type { BodyPoses } from './BodyPoses.ts';
import type { BodyVelocity } from './BodyVelocity.ts';
import type { BodyHandle, JointHandle } from './Handles.ts';
import type { JointDefinition } from './JointDefinition.ts';
import type { SurfaceDefinition } from './SurfaceDefinition.ts';

// One run's physics. Everything going in and out is in pixels and degrees, except gravity, which is in
// m/s² like the World's Gravity field.
export type PhysicsWorld = {
    createBody(definition: BodyDefinition): BodyHandle;
    // Adds one surface's pieces to a body, which then takes its mass from them. A Dynamic body whose
    // surfaces weigh nothing keeps 1 kg and can't spin.
    addSurface(body: BodyHandle, surface: SurfaceDefinition): void;
    // Wakes every body, so a sleeping one feels the new gravity.
    // Joins two bodies that differ. The joint goes when either body is destroyed.
    createJoint(definition: JointDefinition): JointHandle;
    // Destroying a joint its body already took with it does nothing.
    destroyJoint(joint: JointHandle): void;
    setGravity(gravity: Point): void;
    // One step of 1/60 s. Speed is then at most 6,000 px/s and spin 7.5 turns per second.
    step(): void;
    // Records the pose of each body that moved in the last step.
    readMovedBodies(into: BodyPoses): void;
    velocityOf(body: BodyHandle): BodyVelocity;
    destroyBody(body: BodyHandle): void;
    destroy(): void;
};
