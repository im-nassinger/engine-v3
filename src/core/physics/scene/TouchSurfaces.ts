import type { EntityId } from '../../fields/index.ts';

// What a run's touch triggers need from physics, known when the run starts: the solid surfaces whose shapes
// send contact events, so a bump between two solid entities is noticed, and the entities with a shape and
// no SurfaceComponent that are built as sensors, so things pass through them and are noticed. Without a
// touch trigger, a shape with no SurfaceComponent stays out of physics.
export type TouchSurfaces = {
    readonly contactEvents: ReadonlySet<EntityId>;
    readonly sensors: ReadonlySet<EntityId>;
};

export const NO_TOUCH_SURFACES: TouchSurfaces = { contactEvents: new Set(), sensors: new Set() };
