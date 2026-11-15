import type { Bounds, Point } from '../../../core/geometry/index.ts';

// The few flat-geometry questions a hit test asks, all in level positions.
export class PlanarGeometry {
    static distanceToSegment(point: Point, start: Point, end: Point) {
        const segmentX = end.x - start.x;
        const segmentY = end.y - start.y;
        const lengthSquared = segmentX * segmentX + segmentY * segmentY;

        let along = 0;
        if (lengthSquared > 0) {
            const projection = (point.x - start.x) * segmentX + (point.y - start.y) * segmentY;
            along = Math.min(1, Math.max(0, projection / lengthSquared));
        }

        const nearestX = start.x + along * segmentX;
        const nearestY = start.y + along * segmentY;
        const offsetX = point.x - nearestX;
        const offsetY = point.y - nearestY;

        return Math.sqrt(offsetX * offsetX + offsetY * offsetY);
    }

    // Even-odd, the rule a self-crossing outline is filled by. A point exactly on an edge may land either
    // way, which the edge test covers.
    static polygonContains(polygon: readonly Point[], point: Point) {
        let inside = false;
        let previous = polygon[polygon.length - 1];
        if (previous === undefined) return false;

        for (const current of polygon) {
            const crossesTheRow = current.y > point.y !== previous.y > point.y;

            if (crossesTheRow) {
                const share = (point.y - current.y) / (previous.y - current.y);
                const crossingX = current.x + share * (previous.x - current.x);
                if (point.x < crossingX) {
                    inside = !inside;
                }
            }

            previous = current;
        }

        return inside;
    }

    // Liang-Barsky: clips the segment to the box and checks something is left. Touching counts.
    static segmentTouchesBox(start: Point, end: Point, box: Bounds) {
        const deltaX = end.x - start.x;
        const deltaY = end.y - start.y;
        const limits = [
            { towards: -deltaX, room: start.x - box.left },
            { towards: deltaX, room: box.right - start.x },
            { towards: -deltaY, room: start.y - box.top },
            { towards: deltaY, room: box.bottom - start.y },
        ];

        let enter = 0;
        let leave = 1;

        for (const limit of limits) {
            if (limit.towards === 0) {
                if (limit.room < 0) return false;
                continue;
            }

            const share = limit.room / limit.towards;
            if (limit.towards < 0) {
                enter = Math.max(enter, share);
            } else {
                leave = Math.min(leave, share);
            }
        }

        return enter <= leave;
    }

    static distanceToBox(point: Point, box: Bounds) {
        const nearestX = Math.min(box.right, Math.max(box.left, point.x));
        const nearestY = Math.min(box.bottom, Math.max(box.top, point.y));
        const offsetX = point.x - nearestX;
        const offsetY = point.y - nearestY;

        return Math.sqrt(offsetX * offsetX + offsetY * offsetY);
    }
}
