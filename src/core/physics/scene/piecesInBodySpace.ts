import { ShapeComponent } from '../../components/index.ts';
import type { PiecesCache } from '../../derived/index.ts';
import { LineChains, ShapePieces } from '../../geometry/index.ts';
import type { CollisionPiece, Matrix2D, Point } from '../../geometry/index.ts';
import type { Entity } from '../../level/index.ts';

import type { SurfacePiece } from '../contracts/SurfaceDefinition.ts';

// The pipeline's limits after the move into the body's space (simulation.md): a piece smaller than this
// area, in px², or with two points closer than this distance, in px, can't collide and is skipped.
const SMALLEST_AREA = 1;
const SMALLEST_DISTANCE = 0.5;
const SMALLEST_DISTANCE_SQUARED = SMALLEST_DISTANCE * SMALLEST_DISTANCE;

function distanceSquared(first: Point, second: Point) {
    const dx = second.x - first.x;
    const dy = second.y - first.y;

    return dx * dx + dy * dy;
}

function hasPointsTooClose(points: readonly Point[]) {
    for (let first = 0; first < points.length; first++) {
        for (let second = first + 1; second < points.length; second++) {
            const firstPoint = points[first];
            const secondPoint = points[second];
            if (firstPoint === undefined || secondPoint === undefined) continue;
            if (distanceSquared(firstPoint, secondPoint) < SMALLEST_DISTANCE_SQUARED) return true;
        }
    }

    return false;
}

function shoelaceArea(points: readonly Point[]) {
    let doubled = 0;
    points.forEach((point, position) => {
        const next = points[(position + 1) % points.length] ?? point;
        doubled += point.x * next.y - next.x * point.y;
    });

    return Math.abs(doubled) / 2;
}

function movedPiece(piece: CollisionPiece, toBody: Matrix2D): SurfacePiece | undefined {
    if (piece.kind === 'circle') {
        // Only reached when toBody scales evenly, so its stretch is the circle's scale.
        const radius = piece.radius * toBody.largestStretch();
        if (Math.PI * radius * radius < SMALLEST_AREA) return undefined;

        return { kind: 'circle', center: toBody.apply({ x: 0, y: 0 }), radius };
    }

    const points = piece.points.map((point) => toBody.apply(point));
    if (shoelaceArea(points) < SMALLEST_AREA || hasPointsTooClose(points)) return undefined;

    return { kind: 'polygon', points };
}

// Drops each point closer than the limit to the last one kept, so a line shrunk by its parents keeps no
// segment too short to collide. undefined when fewer than two points are left.
function movedChain(chain: readonly Point[], toBody: Matrix2D): SurfacePiece | undefined {
    const kept: Point[] = [];
    for (const point of chain) {
        const moved = toBody.apply(point);
        const last = kept.at(-1);
        if (last !== undefined && distanceSquared(last, moved) < SMALLEST_DISTANCE_SQUARED) continue;

        kept.push(moved);
    }
    if (kept.length < 2) return undefined;

    return { kind: 'line', points: kept };
}

function collisionPiecesOf(entity: Entity, toBody: Matrix2D, pieces: PiecesCache) {
    const result = pieces.piecesOf(entity);
    const ownPieces = result?.pieces ?? [];
    const hasCircle = ownPieces.some((piece) => piece.kind === 'circle');
    if (!hasCircle || toBody.scalesEvenly()) return ownPieces;

    // An uneven scale or a skew would turn the circle into an ellipse, so it goes in as the 32-point polygon,
    // as the physics view draws it.
    const geometry = entity.requireComponent(ShapeComponent).get('geometry');

    return ShapePieces.buildAsPolygons(geometry).pieces;
}

// One entity's collision pieces moved into its body's space by toBody: a line's chains, or its shape's
// pieces, those too small to collide left out. Empty for an entity without a ShapeComponent.
export function piecesInBodySpace(entity: Entity, toBody: Matrix2D, pieces: PiecesCache) {
    const geometry = entity.getComponent(ShapeComponent)?.get('geometry');
    if (geometry === undefined) return [];

    const moved: SurfacePiece[] = [];
    if (geometry.kind === 'line') {
        for (const chain of LineChains.build(geometry.points)) {
            const piece = movedChain(chain, toBody);
            if (piece !== undefined) {
                moved.push(piece);
            }
        }
        return moved;
    }

    for (const piece of collisionPiecesOf(entity, toBody, pieces)) {
        const movedOne = movedPiece(piece, toBody);
        if (movedOne !== undefined) {
            moved.push(movedOne);
        }
    }

    return moved;
}
