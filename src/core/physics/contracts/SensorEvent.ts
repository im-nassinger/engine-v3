import type { EntityId } from '../../fields/index.ts';

// A surface starting or stopping to overlap a sensor in the last step. sensor and visitor are the two
// surfaces' own entities; visitorBody is the entity of the body the visitor is on, the World for the
// ground. A visitor that is a sensor too is still sent, marked, so the game can leave it out. A
// destroyed surface's end comes with the step after, still naming its entities.
export type SensorEvent = {
    readonly kind: 'begin' | 'end';
    readonly sensor: EntityId;
    readonly visitor: EntityId;
    readonly visitorBody: EntityId;
    readonly visitorIsSensor: boolean;
};
