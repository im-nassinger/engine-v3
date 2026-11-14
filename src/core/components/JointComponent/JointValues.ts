import type { EntityId } from '../../fields/index.ts';
import type { JointEnds } from '../../geometry/index.ts';

export type JointType = 'hinge' | 'rope' | 'spring';

// Every setting of every joint type is stored, whatever the type, so switching type in v3 keeps them.
export type JointValues = {
    type: JointType;
    a: EntityId | null;
    b: EntityId | null;
    letConnectedObjectsCollide: boolean;
    limitRotation: boolean;
    minAngle: number;
    maxAngle: number;
    motor: boolean;
    motorSpeed: number;
    motorStrength: number;
    resistance: number;
    matchDrawnDistance: boolean;
    length: number;
    restLength: number;
    stiffness: number;
    damping: number;
    ends: JointEnds;
};
