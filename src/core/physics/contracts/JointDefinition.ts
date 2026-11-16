import type { EntityId } from '../../fields/index.ts';
import type { Point } from '../../geometry/index.ts';

import type { BodyHandle } from './Handles.ts';

// A Hinge for the physics world, in pixels and degrees, with the values play uses: a mirrored joint's
// limits and motor already flipped. A turns against B, and B is the ground body when field B is empty.
// Each end is a level position, on its own body; the angle between the two bodies at the start reads 0.
// Positive angles and motor speeds are clockwise on screen. Motor strength and Resistance are in N·m at
// 50 px per metre. Resistance acts only while Motor is off.
export type HingeDefinition = {
    readonly type: 'hinge';
    readonly entity: EntityId;
    readonly bodyA: BodyHandle;
    readonly bodyB: BodyHandle;
    readonly endA: Point;
    readonly endB: Point;
    readonly letConnectedObjectsCollide: boolean;
    readonly limitRotation: boolean;
    readonly minAngle: number;
    readonly maxAngle: number;
    readonly motor: boolean;
    readonly motorSpeed: number;
    readonly motorStrength: number;
    readonly resistance: number;
};

// Rope and Spring come in stage 14's step 3.
export type JointDefinition = HingeDefinition;
