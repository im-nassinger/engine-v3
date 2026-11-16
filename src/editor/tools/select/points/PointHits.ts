import type { Bounds, Point } from '../../../../core/geometry/index.ts';
import { PlanarGeometry } from '../../../hit-testing/index.ts';

// A point is hit within 6 screen px of its middle: the 8 px handle with a little room.
export const POINT_HIT_PX = 6;
// An edge is hit within 5 screen px, as a line's hit area.
export const EDGE_HIT_PX = 5;

// Where an edge was hit: the edge from point `startIndex` to the next, and the nearest place on it.
export type EdgeHit = {
    readonly startIndex: number;
    readonly position: Point;
};

// What lies under the mouse among a polygon's or line's points, all in level positions. A polygon has an
// edge from its last point back to its first; a line doesn't.
export class PointHits {
    private readonly points: readonly Point[];
    private readonly isClosed: boolean;

    constructor(points: readonly Point[], isClosed: boolean) {
        this.points = points;
        this.isClosed = isClosed;
    }

    // The index of the nearest point within reach, the topmost (last) one on a tie.
    pointAt(position: Point, zoom: number) {
        const reach = POINT_HIT_PX / zoom;
        let nearestIndex: number | undefined;
        let nearestDistance = Infinity;

        this.points.forEach((point, index) => {
            const distance = Math.hypot(point.x - position.x, point.y - position.y);
            const isNearer = distance <= reach && distance <= nearestDistance;
            if (!isNearer) return;

            nearestIndex = index;
            nearestDistance = distance;
        });

        return nearestIndex;
    }

    // The nearest edge within reach.
    edgeAt(position: Point, zoom: number): EdgeHit | undefined {
        const reach = EDGE_HIT_PX / zoom;
        let nearest: EdgeHit | undefined;
        let nearestDistance = Infinity;

        for (let startIndex = 0; startIndex < this.edgeCount(); startIndex += 1) {
            const start = this.requirePoint(startIndex);
            const end = this.requirePoint((startIndex + 1) % this.points.length);
            const distance = PlanarGeometry.distanceToSegment(position, start, end);
            const isNearer = distance <= reach && distance < nearestDistance;
            if (!isNearer) continue;

            nearest = { startIndex, position: nearestOnSegment(position, start, end) };
            nearestDistance = distance;
        }

        return nearest;
    }

    // The indexes of the points inside the box, in order.
    pointsInBox(box: Bounds) {
        const inside: number[] = [];

        this.points.forEach((point, index) => {
            if (box.contains(point)) {
                inside.push(index);
            }
        });

        return inside;
    }

    private edgeCount() {
        if (this.points.length < 2) return 0;
        if (this.isClosed) return this.points.length;

        return this.points.length - 1;
    }

    private requirePoint(index: number) {
        const point = this.points[index];
        if (point === undefined) throw new Error(`No point ${index}`);

        return point;
    }
}

function nearestOnSegment(position: Point, start: Point, end: Point): Point {
    const segmentX = end.x - start.x;
    const segmentY = end.y - start.y;
    const lengthSquared = segmentX * segmentX + segmentY * segmentY;
    if (lengthSquared === 0) return start;

    const projection = (position.x - start.x) * segmentX + (position.y - start.y) * segmentY;
    const along = Math.min(1, Math.max(0, projection / lengthSquared));

    return { x: start.x + along * segmentX, y: start.y + along * segmentY };
}
