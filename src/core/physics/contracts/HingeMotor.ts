import type { HingeDefinition } from './JointDefinition.ts';

// A Hinge's motor values a running world can change, as in HingeDefinition: already flipped for a
// mirrored joint, and Resistance acting only while Motor is off.
export type HingeMotor = Pick<HingeDefinition, 'motor' | 'motorSpeed' | 'motorStrength' | 'resistance'>;
