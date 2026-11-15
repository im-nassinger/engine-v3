import type { Point } from '../../../core/geometry/index.ts';

// A run of straight edges in level positions. A closed one also joins its last point to its first.
export type Polyline = {
    readonly points: readonly Point[];
    readonly closed: boolean;
};
