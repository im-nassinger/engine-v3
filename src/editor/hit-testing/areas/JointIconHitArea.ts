import type { Bounds, Point } from '../../../core/geometry/index.ts';
import type { HitArea } from './HitArea.ts';
import { PlanarGeometry } from './PlanarGeometry.ts';

// A joint's round icons, one for a Hinge and one on each end of a Rope or Spring, the same size on screen
// at any zoom, so their radius here is in level pixels.
export class JointIconHitArea implements HitArea {
    private readonly centres: readonly Point[];
    private readonly radius: number;

    constructor(centres: readonly Point[], radius: number) {
        this.centres = centres;
        this.radius = radius;
    }

    touchesPoint(point: Point) {
        return this.centres.some((centre) => {
            const offsetX = point.x - centre.x;
            const offsetY = point.y - centre.y;

            return Math.sqrt(offsetX * offsetX + offsetY * offsetY) <= this.radius;
        });
    }

    touchesBox(box: Bounds) {
        return this.centres.some((centre) => PlanarGeometry.distanceToBox(centre, box) <= this.radius);
    }
}
