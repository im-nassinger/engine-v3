import type { Bounds } from '../../../core/geometry/index.ts';
import type { Entity } from '../../../core/level/index.ts';

// Finds the entities that may be in an area, back to front. It may return more than overlap; HitTester
// checks each one's cached bounds and then its hit area.
export type SpatialIndex = {
    query(area: Bounds): Iterable<Entity>;
};
