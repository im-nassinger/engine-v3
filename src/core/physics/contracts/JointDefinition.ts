import type { EntityId } from '../../fields/index.ts';
import type { Point } from '../../geometry/index.ts';

import type { BodyHandle } from './Handles.ts';

// What every joint for the physics world has, in pixels. B is the ground body when field B is empty.
// Each end is a level position, on its own body.
type JointEnds = {
    readonly entity: EntityId;
    readonly bodyA: BodyHandle;
    readonly bodyB: BodyHandle;
    readonly endA: Point;
    readonly endB: Point;
    readonly letConnectedObjectsCollide: boolean;
};

// A Hinge, in degrees, with the values play uses: a mirrored joint's limits and motor already flipped.
// A turns against B; the angle between the two bodies at the start reads 0. Positive angles and motor
// speeds are clockwise on screen. Motor strength and Resistance are in N·m at 50 px per metre.
// Resistance acts only while Motor is off.
export type HingeDefinition = JointEnds & {
    readonly type: 'hinge';
    readonly limitRotation: boolean;
    readonly minAngle: number;
    readonly maxAngle: number;
    readonly motor: boolean;
    readonly motorSpeed: number;
    readonly motorStrength: number;
    readonly resistance: number;
};

// A Rope keeps its ends at most Length apart and pulls nothing until taut. Length is the one play uses:
// already the drawn gap or the typed one times the joint's scale.
export type RopeDefinition = JointEnds & {
    readonly type: 'rope';
    readonly length: number;
};

// A Spring pulls its ends back to Rest length, which is already the one play uses. Stiffness is in
// bounces per second and Damping from 0, bouncing on, to 1, settling at once.
export type SpringDefinition = JointEnds & {
    readonly type: 'spring';
    readonly restLength: number;
    readonly stiffness: number;
    readonly damping: number;
};

export type JointDefinition = HingeDefinition | RopeDefinition | SpringDefinition;
