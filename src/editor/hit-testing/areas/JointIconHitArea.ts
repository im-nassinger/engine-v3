import type { Bounds, Point } from '../../../core/geometry/index.ts';
import type { HitArea } from './HitArea.ts';
import { PlanarGeometry } from './PlanarGeometry.ts';

// A joint's round icon, the same size on screen at any zoom, so its radius here is in level pixels.
export class JointIconHitArea implements HitArea {
    private readonly centre: Point;
    private readonly radius: number;

    constructor(centre: Point, radius: number) {
        this.centre = centre;
        this.radius = radius;
    }

    touchesPoint(point: Point) {
        const offsetX = point.x - this.centre.x;
        const offsetY = point.y - this.centre.y;
        const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);

        return distance <= this.radius;
    }

    touchesBox(box: Bounds) {
        const distance = PlanarGeometry.distanceToBox(this.centre, box);

        return distance <= this.radius;
    }
}
