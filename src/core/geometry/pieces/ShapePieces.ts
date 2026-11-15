import { DeterministicMath } from '../../math/index.ts';

import type { CollisionPiece } from './CollisionPiece.ts';
import { ConvexMerging } from './ConvexMerging.ts';
import { EarClipping } from './EarClipping.ts';
import { OutlineCleaning } from './OutlineCleaning.ts';
import type { Point } from '../Point.ts';
import { PolygonLibrary } from './PolygonLibrary.ts';
import { pointAt, turn } from './Ring.ts';
import type { ShapeGeometry } from '../ShapeGeometry.ts';

// A fixed count, because the points of a stretched circle decide how it collides, so they must be the same
// on every computer and in every version.
export const CIRCLE_POINT_COUNT = 32;

// The requirement's limit: a piece narrower than this can't collide.
const SMALLEST_COLLIDING_SIZE = 1;

// filledOutlines are step 2's outlines, cleaned, which drawing fills and hit testing reads. A circle has
// none: its one circle piece is drawn and hit tested as a circle. A line has neither; it becomes chains.
export type ShapePiecesResult = {
    readonly filledOutlines: readonly (readonly Point[])[];
    readonly pieces: readonly CollisionPiece[];
};

const NOTHING: ShapePiecesResult = { filledOutlines: [], pieces: [] };

function rectangleOutline(width: number, height: number) {
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
function circleOutline(radius: number) {
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

// A convex piece's width across one edge is the largest distance of its points from that edge's line:
// turn / edge length. It is narrower than the limit if that holds across any edge. Compared squared so
// no square root is needed.
function isTooSmall(piece: readonly Point[]) {
    for (let position = 0; position < piece.length; position++) {
        const edgeStart = pointAt(piece, position);
        const edgeEnd = pointAt(piece, position + 1);
        const dx = edgeEnd.x - edgeStart.x;
        const dy = edgeEnd.y - edgeStart.y;
        const edgeLengthSquared = dx * dx + dy * dy;

        let widest = 0;
        for (const point of piece) {
            widest = Math.max(widest, turn(edgeStart, edgeEnd, point));
        }

        const widestSquared = widest * widest;
        const limitSquared = SMALLEST_COLLIDING_SIZE * SMALLEST_COLLIDING_SIZE * edgeLengthSquared;
        if (widestSquared < limitSquared) return true;
    }

    return false;
}

function toPolygonPieces(convexPieces: readonly (readonly Point[])[]) {
    const pieces: CollisionPiece[] = [];

    for (const points of convexPieces) {
        if (isTooSmall(points)) continue;

        pieces.push({ kind: 'polygon', points });
    }

    return pieces;
}

// Steps 1 to 5 of the polygon pipeline in geometry.md.
function polygonPieces(points: readonly Point[]): ShapePiecesResult {
    const cleaned = OutlineCleaning.clean(points);
    if (cleaned.length === 0) return NOTHING;

    const filled = PolygonLibrary.fillEnclosedAreas(cleaned);
    const filledOutlines: Point[][] = [];
    const convexPieces: Point[][] = [];

    for (const outline of filled) {
        const cleanedOutline = OutlineCleaning.clean(outline);
        if (cleanedOutline.length === 0) continue;

        filledOutlines.push(cleanedOutline);

        const triangles = EarClipping.triangulate(cleanedOutline);
        const merged = ConvexMerging.merge(triangles);
        convexPieces.push(...merged);
    }

    const pieces = toPolygonPieces(convexPieces);

    return { filledOutlines, pieces };
}

function rectanglePieces(width: number, height: number): ShapePiecesResult {
    const outline = rectangleOutline(width, height);
    const pieces = toPolygonPieces([outline]);

    return { filledOutlines: [outline], pieces };
}

function circlePieces(radius: number): ShapePiecesResult {
    const diameter = radius * 2;
    if (diameter < SMALLEST_COLLIDING_SIZE) return NOTHING;

    return { filledOutlines: [], pieces: [{ kind: 'circle', radius }] };
}

function stretchableCirclePieces(radius: number) {
    const outline = circleOutline(radius);

    return polygonPieces(outline);
}

// Turns one ShapeComponent's geometry into its collision pieces, in the shape's own space. PiecesCache
// keeps the result and rebuilds it only when the geometry changes, never when the shape moves.
export class ShapePieces {
    static build(geometry: ShapeGeometry) {
        if (geometry.kind === 'circle') return circlePieces(geometry.radius);

        return ShapePieces.buildAsPolygons(geometry);
    }

    // The same, but a circle comes back as the 32-point polygon. The play copy asks for this when an
    // entity's level matrix scales unevenly or skews, which would turn its circle into an ellipse.
    static buildAsPolygons(geometry: ShapeGeometry): ShapePiecesResult {
        switch (geometry.kind) {
            case 'rectangle':
                return rectanglePieces(geometry.width, geometry.height);
            case 'circle':
                return stretchableCirclePieces(geometry.radius);
            case 'polygon':
                return polygonPieces(geometry.points);
            case 'line':
                return NOTHING;
        }
    }
}
