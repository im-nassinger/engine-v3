import type { Point } from './Point.ts';

// Sharp has no handles. Smooth keeps its two handles in one line, mirrored. Separate is smooth with
// handles that move on their own.
export type PathCorner = 'sharp' | 'smooth' | 'separate';

// A handle is measured from its point.
export type PathPoint = {
    readonly x: number;
    readonly y: number;
    readonly handleIn: Point | null;
    readonly handleOut: Point | null;
    readonly corner: PathCorner;
};

// In the path's own space. v1 only makes straight paths, for a Rope or a Spring, but the stored shape is
// v2's pen's already, so v2 never changes saved files.
export type PathGeometry = {
    readonly closed: boolean;
    readonly points: readonly PathPoint[];
};
