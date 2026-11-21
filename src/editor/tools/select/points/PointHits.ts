import type { Bounds, Point } from '../../../../core/geometry/index.ts';
import { PlanarGeometry } from '../../../hit-testing/index.ts';

// A point is hit within 6 screen px of its middle: the 8 px handle with a little room.
export const POINT_HIT_PX = 6;
// A selected point's handle is hit within 6 screen px of its 6 px dot's middle.
export const HANDLE_HIT_PX = 6;
// An edge is hit within 5 screen px, as a line's hit area.
export const EDGE_HIT_PX = 5;

// Where an edge was hit: the edge from point `startIndex` to the next, and the nearest place on it.
export type EdgeHit = {
    readonly startIndex: number;
    readonly position: Point;
};

// What lies under the mouse among a polygon's, line's or path's points, all in level positions. A polygon
// and a closed path have an edge from their last point back to their first; a line and an open path don't.
// A path's curved edge is given as the straight steps it is cut into, from its start point to the next.
export class PointHits {
    private readonly points: readonly Point[];
    private readonly isClosed: boolean;
    private readonly edgeSteps: readonly (readonly Point[])[] | undefined;

    constructor(points: readonly Point[], isClosed: boolean, edgeSteps?: readonly (readonly Point[])[]) {
        this.points = points;
        this.isClosed = isClosed;
        this.edgeSteps = edgeSteps;
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
            const onEdge = nearestOnLine(this.edgeLine(startIndex), position);
            const isNearer = onEdge !== undefined && onEdge.distance <= reach && onEdge.distance < nearestDistance;
            if (!isNearer) continue;

            nearest = { startIndex, position: onEdge.position };
            nearestDistance = onEdge.distance;
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

    // The edge from point `startIndex` to the next, as the straight steps it is drawn with.
    private edgeLine(startIndex: number): readonly Point[] {
        const steps = this.edgeSteps?.[startIndex];
        if (steps !== undefined) return steps;

        const start = this.requirePoint(startIndex);
        const end = this.requirePoint((startIndex + 1) % this.points.length);

        return [start, end];
    }

    private requirePoint(index: number) {
        const point = this.points[index];
        if (point === undefined) throw new Error(`No point ${index}`);

        return point;
    }
}

// The nearest place to the position on a line of straight steps, and how far it is.
function nearestOnLine(line: readonly Point[], position: Point) {
    let nearest: { readonly position: Point; readonly distance: number } | undefined;

    line.forEach((end, index) => {
        const start = line[index - 1];
        if (start === undefined) return;

        const distance = PlanarGeometry.distanceToSegment(position, start, end);
        if (nearest !== undefined && distance >= nearest.distance) return;

        nearest = { position: nearestOnSegment(position, start, end), distance };
    });

    return nearest;
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
