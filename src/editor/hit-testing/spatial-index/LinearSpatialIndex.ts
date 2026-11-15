import type { Level } from '../../../core/level/index.ts';
import type { SpatialIndex } from './SpatialIndex.ts';

// v1's index: every entity, whatever the area. A grid index replaces it only if the speed test fails.
export class LinearSpatialIndex implements SpatialIndex {
    private readonly level: Level;

    constructor(level: Level) {
        this.level = level;
    }

    // The area is ignored: HitTester checks every entity's cached bounds itself.
    query() {
        return this.level.entitiesInDrawOrder();
    }
}
