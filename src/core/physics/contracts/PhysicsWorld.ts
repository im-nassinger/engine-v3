import type { EntityId } from '../../fields/index.ts';
import type { Point } from '../../geometry/index.ts';

import type { BodyDefinition } from './BodyDefinition.ts';
import type { BodyPose } from './BodyPose.ts';
import type { BodyPoses } from './BodyPoses.ts';
import type { BodyVelocity } from './BodyVelocity.ts';
import type { ContactEvent } from './ContactEvent.ts';
import type { BodyHandle, JointHandle } from './Handles.ts';
import type { HingeMotor } from './HingeMotor.ts';
import type { JointDefinition } from './JointDefinition.ts';
import type { SensorEvent } from './SensorEvent.ts';
import type { SurfaceDefinition } from './SurfaceDefinition.ts';
import type { SurfaceSettings } from './SurfaceSettings.ts';

// One run's physics. Everything going in and out is in pixels and degrees, except gravity, which is in
// m/s² like the World's Gravity field.
export type PhysicsWorld = {
    createBody(definition: BodyDefinition): BodyHandle;
    // Adds one surface's pieces to a body, which then takes its mass from them. A Dynamic body whose
    // surfaces weigh nothing keeps 1 kg and can't spin.
    addSurface(body: BodyHandle, surface: SurfaceDefinition): void;
    // Joins two bodies that differ. The joint goes when either body is destroyed.
    createJoint(definition: JointDefinition): JointHandle;
    // Destroying a joint its body already took with it does nothing.
    destroyJoint(joint: JointHandle): void;
    // Wakes every body, so a sleeping one feels the new gravity.
    setGravity(gravity: Point): void;
    // One step of 1/60 s. Speed is then at most 6,000 px/s and spin 7.5 turns per second.
    step(): void;
    // Records the pose of each body that moved in the last step.
    readMovedBodies(into: BodyPoses): void;
    // Adds the sensor events of the last step, begins first, in Box2D's own order.
    readSensorEvents(into: SensorEvent[]): void;
    // The contact events of the last step, begins first, in Box2D's own order. Only the surfaces in
    // WorldSettings' contactEventSurfaces send them, a surface rebuilt in play too.
    contactEvents(): readonly ContactEvent[];
    // The body's live speed and spin.
    velocity(body: BodyHandle): BodyVelocity;
    // Teleports a body and wakes it; its speed is kept.
    setPose(body: BodyHandle, pose: BodyPose): void;
    // Adds to a body's speed in px/s, whatever its mass, and wakes it. A Static body doesn't move.
    addVelocity(body: BodyHandle, velocity: Point): void;
    // Changes every surface the entity gave this world; one play left out has nothing to change. Friction
    // and Restitution change in place. A change of Sensor rebuilds the surface, so its overlaps end and
    // begin again in the next step.
    setSurfaceSettings(entity: EntityId, settings: SurfaceSettings): void;
    // Changes a Hinge's motor and wakes its bodies. Does nothing if its body took it.
    setMotor(joint: JointHandle, motor: HingeMotor): void;
    destroyBody(body: BodyHandle): void;
    // Takes every surface the entity gave this world out of the body it went to, which stays: a shape
    // merged into a group's body or the ground. A body that loses weight takes its mass from what is left.
    // A surface whose body was destroyed is already gone.
    removeSurfaces(entity: EntityId): void;
    destroy(): void;
};
