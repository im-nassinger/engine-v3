import type { EntityId } from '../../fields/index.ts';

// A surface starting or stopping to overlap a sensor in the last step. sensor and visitor are the two
// surfaces' own entities; sensorBody and visitorBody are the entities of the bodies they are on, the World
// for the ground. A visitor that is a sensor too is still sent, marked, so the game can leave it out. A
// destroyed surface's end comes with the step after, still naming its entities.
export type SensorEvent = {
    readonly kind: 'begin' | 'end';
    readonly sensor: EntityId;
    readonly sensorBody: EntityId;
    readonly visitor: EntityId;
    readonly visitorBody: EntityId;
    readonly visitorIsSensor: boolean;
};
