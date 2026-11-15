import type { Bounds, Point } from '../../../core/geometry/index.ts';
import type { HitArea } from './HitArea.ts';
import { PlanarGeometry } from './PlanarGeometry.ts';
import type { Polyline } from './Polyline.ts';

function edgesOf(line: Polyline) {
    const edges: { readonly start: Point; readonly end: Point }[] = [];
    const points = line.points;

    for (let i = 1; i < points.length; i++) {
        const start = points[i - 1];
        const end = points[i];
        if (start === undefined || end === undefined) continue;

        edges.push({ start, end });
    }

    const first = points[0];
    const last = points[points.length - 1];
    const joinsBack = line.closed && points.length > 2;
    if (joinsBack && first !== undefined && last !== undefined) {
        edges.push({ start: last, end: first });
    }

    return edges;
}

// A shape, a path or the camera's frame: hit within edgeReach of its lines, or anywhere inside its fills.
// The box ignores edgeReach, because the box itself is drawn exactly.
export class OutlineHitArea implements HitArea {
    private readonly lines: readonly Polyline[];
    private readonly fills: readonly (readonly Point[])[];
    private readonly edgeReach: number;

    constructor(lines: readonly Polyline[], fills: readonly (readonly Point[])[], edgeReach: number) {
        this.lines = lines;
        this.fills = fills;
        this.edgeReach = edgeReach;
    }

    touchesPoint(point: Point) {
        const insideAFill = this.fills.some((fill) => PlanarGeometry.polygonContains(fill, point));
        if (insideAFill) return true;

        return this.allEdges().some((edge) => {
            const distance = PlanarGeometry.distanceToSegment(point, edge.start, edge.end);
            return distance <= this.edgeReach;
        });
    }

    touchesBox(box: Bounds) {
        const fillLines = this.fills.map((points) => ({ points, closed: true }));
        const edges = [...this.allEdges(), ...fillLines.flatMap(edgesOf)];
        const anEdgeTouches = edges.some((edge) => PlanarGeometry.segmentTouchesBox(edge.start, edge.end, box));
        if (anEdgeTouches) return true;

        // No edge reaches the box, so the box is either wholly inside a fill or apart from it.
        const corner = { x: box.left, y: box.top };
        return this.fills.some((fill) => PlanarGeometry.polygonContains(fill, corner));
    }

    private allEdges() {
        return this.lines.flatMap(edgesOf);
    }
}
