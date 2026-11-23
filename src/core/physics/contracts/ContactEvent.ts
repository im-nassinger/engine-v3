import type { EntityId } from '../../fields/index.ts';

// Two solid surfaces starting or stopping to touch in the last step, sent only when one of them has
// contact events switched on. surfaceA and surfaceB are the two surfaces' own entities, in Box2D's order,
// not by which one moved; bodyA and bodyB are the entities of the bodies they are on, the World for the
// ground. A destroyed surface's end comes with the step after, still naming its entities.
export type ContactEvent = {
    readonly kind: 'begin' | 'end';
    readonly surfaceA: EntityId;
    readonly bodyA: EntityId;
    readonly surfaceB: EntityId;
    readonly bodyB: EntityId;
};
