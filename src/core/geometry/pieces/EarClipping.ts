import type { Point } from '../Point.ts';
import { pointAt, samePlace, signedDoubleArea, turn } from './Ring.ts';

type Corner = {
    readonly previous: Point;
    readonly current: Point;
    readonly next: Point;
};

function turnOf(corner: Corner) {
    return turn(corner.previous, corner.current, corner.next);
}

function cornerAt(ring: readonly Point[], position: number): Corner {
    const previous = pointAt(ring, position - 1);
    const current = pointAt(ring, position);
    const next = pointAt(ring, position + 1);

    return { previous, current, next };
}

function isCornerPoint(point: Point, corner: Corner) {
    return samePlace(point, corner.previous) || samePlace(point, corner.current) || samePlace(point, corner.next);
}

// Inside or on an edge. Callers have already checked that the corner turns the positive way.
function insideTriangle(point: Point, corner: Corner) {
    const insideFirstEdge = turn(corner.previous, corner.current, point) >= 0;
    const insideSecondEdge = turn(corner.current, corner.next, point) >= 0;
    const insideThirdEdge = turn(corner.next, corner.previous, point) >= 0;

    return insideFirstEdge && insideSecondEdge && insideThirdEdge;
}

// An ear is a convex corner whose triangle holds no other point of the outline. Points in the same
// place as one of the triangle's corners don't count, so an outline that touches itself at a point,
// as a filled outline can, still has ears.
function isEar(ring: readonly Point[], position: number) {
    const corner = cornerAt(ring, position);
    if (turnOf(corner) <= 0) return false;

    for (const point of ring) {
        if (isCornerPoint(point, corner)) continue;
        if (insideTriangle(point, corner)) return false;
    }

    return true;
}

function findPosition(ring: readonly Point[], matches: (position: number) => boolean) {
    for (let position = 0; position < ring.length; position++) {
        if (matches(position)) return position;
    }

    return undefined;
}

// Splits a simple outline with no holes into triangles by cutting off ears, one at a time. It uses
// only + - x and comparisons, so every computer gives the same triangles. The search starts at the
// first point each time, which keeps the result a function of the input alone. Time grows with the
// cube of the point count at worst, fine for drawn outlines of a few hundred points.
export class EarClipping {
    // Triangles turn the same way as an outline with a positive area, whatever way the input turns.
    static triangulate(outline: readonly Point[]) {
        const triangles: Point[][] = [];
        if (outline.length < 3) return triangles;

        const ring = [...outline];
        const turnsNegative = signedDoubleArea(outline) < 0;
        if (turnsNegative) {
            ring.reverse();
        }

        while (ring.length > 3) {
            const earPosition = findPosition(ring, (position) => isEar(ring, position));

            if (earPosition !== undefined) {
                const ear = cornerAt(ring, earPosition);
                triangles.push([ear.previous, ear.current, ear.next]);
                ring.splice(earPosition, 1);
                continue;
            }

            // A simple outline always has an ear, so only one that isn't simple gets here. A straight
            // corner is dropped first, as it holds no area; otherwise the first convex corner is cut
            // anyway, so the loop always ends.
            const straightPosition = findPosition(ring, (position) => turnOf(cornerAt(ring, position)) === 0);
            if (straightPosition !== undefined) {
                ring.splice(straightPosition, 1);
                continue;
            }

            const convexPosition = findPosition(ring, (position) => turnOf(cornerAt(ring, position)) > 0);
            if (convexPosition === undefined) return triangles;

            const convexCorner = cornerAt(ring, convexPosition);
            triangles.push([convexCorner.previous, convexCorner.current, convexCorner.next]);
            ring.splice(convexPosition, 1);
        }

        const lastCorner = cornerAt(ring, 1);
        if (turnOf(lastCorner) > 0) {
            triangles.push([lastCorner.previous, lastCorner.current, lastCorner.next]);
        }

        return triangles;
    }
}
