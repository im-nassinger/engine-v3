import type { DerivedCaches } from '../../../core/derived/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import type { ViewState } from '../../view/index.ts';
import type { SnapOptions, SnapResult, Snapper } from '../Snapper.ts';

// The caches PointSnapper reads: each entity's own bounds, pieces and matrix.
export type PointSnapCaches = Pick<DerivedCaches, 'bounds' | 'pieces' | 'worldMatrices'>;

// How near a centre or corner a joint's end must come to snap to it, the same on screen at every zoom.
export const SNAP_DISTANCE_PX = 6;

const ORIGIN: Point = { x: 0, y: 0 };

// Snaps a joint's end to the centres and corners of the entities under the mouse: the centre of each one's
// own bounds and every point of its pieces, a circle's centre for a circle, in level positions. The nearest
// within 6 screen px wins; failing that, the point goes to the snapper given, the grid. Ctrl turns both off.
// v3's snapping to entities replaces the first half.
export class PointSnapper {
    private readonly caches: PointSnapCaches;
    private readonly fallback: Snapper;

    constructor(caches: PointSnapCaches, fallback: Snapper) {
        this.caches = caches;
        this.fallback = fallback;
    }

    snapPoint(point: Point, targets: readonly Entity[], view: ViewState, options: SnapOptions): SnapResult {
        if (options.ctrlHeld) return { point, snappedX: false, snappedY: false };

        const reach = SNAP_DISTANCE_PX / view.zoom;
        let nearest: Point | undefined;
        let nearestDistance = Infinity;

        for (const target of targets) {
            for (const candidate of this.snapPointsOf(target)) {
                const distance = Math.hypot(candidate.x - point.x, candidate.y - point.y);
                if (distance > reach || distance >= nearestDistance) continue;

                nearest = candidate;
                nearestDistance = distance;
            }
        }

        if (nearest === undefined) return this.fallback.snapPoint(point, view, options);

        return { point: nearest, snappedX: true, snappedY: true };
    }

    private snapPointsOf(entity: Entity) {
        const points: Point[] = [];
        const bounds = this.caches.bounds.ownBoundsOf(entity);
        if (bounds !== undefined) {
            points.push(bounds.centre);
        }

        const pieces = this.caches.pieces.piecesOf(entity)?.pieces ?? [];
        const matrix = this.caches.worldMatrices.matrixOf(entity);
        for (const piece of pieces) {
            const own = piece.kind === 'circle' ? [ORIGIN] : piece.points;
            points.push(...own.map((corner) => matrix.apply(corner)));
        }

        return points;
    }
}
