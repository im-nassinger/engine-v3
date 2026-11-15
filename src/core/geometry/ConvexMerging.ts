import type { Point } from './Point.ts';
import { pointAt, samePlace, startingAt, turn } from './Ring.ts';

// Box2D's largest polygon.
export const MOST_POINTS_PER_PIECE = 8;

type SharedEdge = {
    readonly firstPosition: number;
    readonly secondPosition: number;
};

function isConvex(ring: readonly Point[]) {
    if (ring.length < 3) return false;

    for (let position = 0; position < ring.length; position++) {
        const previous = pointAt(ring, position - 1);
        const current = pointAt(ring, position);
        const next = pointAt(ring, position + 1);
        if (turn(previous, current, next) <= 0) return false;
    }

    return true;
}

// Only corners that are exactly straight are dropped, as they hold no area. Dropping a nearly straight
// one would add or remove a sliver, so the pieces would no longer cover exactly the filled outline.
function withoutExactlyStraightPoints(outline: readonly Point[]) {
    const ring = [...outline];
    let position = 0;

    while (position < ring.length && ring.length > 3) {
        const previous = pointAt(ring, position - 1);
        const current = pointAt(ring, position);
        const next = pointAt(ring, position + 1);

        if (turn(previous, current, next) === 0) {
            ring.splice(position, 1);
            position = 0;
            continue;
        }

        position++;
    }

    return ring;
}

// The first piece's edge from a to b that the second piece walks from b to a, as both turn the same way.
function findSharedEdge(first: readonly Point[], second: readonly Point[]): SharedEdge | undefined {
    for (let firstPosition = 0; firstPosition < first.length; firstPosition++) {
        const edgeStart = pointAt(first, firstPosition);
        const edgeEnd = pointAt(first, firstPosition + 1);

        for (let secondPosition = 0; secondPosition < second.length; secondPosition++) {
            const startsAtEnd = samePlace(pointAt(second, secondPosition), edgeEnd);
            const endsAtStart = samePlace(pointAt(second, secondPosition + 1), edgeStart);
            if (startsAtEnd && endsAtStart) return { firstPosition, secondPosition };
        }
    }

    return undefined;
}

// Walks the first piece from the shared edge's end round to its start, then the second piece's points
// between the two, which leaves the shared edge out.
function joinAt(first: readonly Point[], second: readonly Point[], edge: SharedEdge) {
    const firstFromEdgeEnd = startingAt(first, edge.firstPosition + 1);
    const secondFromEdgeStart = startingAt(second, edge.secondPosition + 1);
    const secondBetween = secondFromEdgeStart.slice(1, -1);

    return [...firstFromEdgeEnd, ...secondBetween];
}

function tryJoin(first: readonly Point[], second: readonly Point[]) {
    const edge = findSharedEdge(first, second);
    if (edge === undefined) return undefined;

    const joined = joinAt(first, second, edge);
    const cleaned = withoutExactlyStraightPoints(joined);
    if (cleaned.length > MOST_POINTS_PER_PIECE) return undefined;
    if (!isConvex(cleaned)) return undefined;

    return cleaned;
}

// Joins every later piece it can into the piece at firstIndex, starting over after each join, because
// a bigger piece may now share an edge with a piece already passed.
function joinIntoPiece(pieces: Point[][], firstIndex: number) {
    let joinedAny = false;
    let secondIndex = firstIndex + 1;

    while (secondIndex < pieces.length) {
        const first = pieces[firstIndex] ?? [];
        const second = pieces[secondIndex] ?? [];
        const joined = tryJoin(first, second);

        if (joined === undefined) {
            secondIndex++;
            continue;
        }

        pieces[firstIndex] = joined;
        pieces.splice(secondIndex, 1);
        joinedAny = true;
        secondIndex = firstIndex + 1;
    }

    return joinedAny;
}

// Step 4 of the polygon pipeline, Hertel-Mehlhorn: two pieces sharing an edge become one whenever the
// result stays convex and has at most 8 points. Pieces are tried in a fixed order, so the result depends
// only on the input. Each pass looks at every pair once and passes repeat until nothing joins.
export class ConvexMerging {
    static merge(triangles: readonly (readonly Point[])[]) {
        const pieces = triangles.map((triangle) => [...triangle]);
        let joinedAny = true;

        while (joinedAny) {
            joinedAny = false;

            for (let firstIndex = 0; firstIndex < pieces.length; firstIndex++) {
                const joinedHere = joinIntoPiece(pieces, firstIndex);
                joinedAny = joinedAny || joinedHere;
            }
        }

        return pieces;
    }

    static isConvex(piece: readonly Point[]) {
        return isConvex(piece);
    }
}
