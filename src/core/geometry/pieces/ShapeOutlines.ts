import { DeterministicMath } from '../../math/index.ts';

import type { Point } from '../Point.ts';

// A fixed count, because the points of a stretched circle decide how it collides, so they must be the same
// on every computer and in every version.
export const CIRCLE_POINT_COUNT = 32;

// A rectangle's and a circle's outlines as points, centred on the shape's own origin. Collision pieces are
// built from them, and changing a shape's kind to a polygon or line keeps them.
export class ShapeOutlines {
    static rectangle(width: number, height: number): Point[] {
        const halfWidth = width / 2;
        const halfHeight = height / 2;

        return [
            { x: -halfWidth, y: -halfHeight },
            { x: halfWidth, y: -halfHeight },
            { x: halfWidth, y: halfHeight },
            { x: -halfWidth, y: halfHeight },
        ];
    }

    // Increasing angles turn clockwise on screen with y down, so the outline has a positive area. sinCos is
    // exact at quarter turns, so the four extreme points sit exactly on the circle's box.
    static circle(radius: number) {
        const degreesPerPoint = 360 / CIRCLE_POINT_COUNT;
        const outline: Point[] = [];

        for (let i = 0; i < CIRCLE_POINT_COUNT; i++) {
            const angle = DeterministicMath.sinCos(i * degreesPerPoint);
            const x = radius * angle.cos + 0;
            const y = radius * angle.sin + 0;
            outline.push({ x, y });
        }

        return outline;
    }
}
