import type { Point } from '../Point.ts';
import { turn } from './Ring.ts';

// The same limit as an outline's: Box2D's linear slop, 0.005 m, in pixels. Chain points closer than
// this make Box2D's ghost collision misbehave.
const MERGE_DISTANCE = 0.25;
const MERGE_DISTANCE_SQUARED = MERGE_DISTANCE * MERGE_DISTANCE;

// A place on the line: along segment `segment`, a fraction `along` of the way from its start.
type Cut = {
    readonly segment: number;
    readonly along: number;
    readonly point: Point;
};

function isClose(first: Point, second: Point) {
    const dx = second.x - first.x;
    const dy = second.y - first.y;

    return dx * dx + dy * dy < MERGE_DISTANCE_SQUARED;
}

// Drops every point closer than the limit to the last one kept, but always keeps the line's last point,
// in place of the kept point it is close to, so chains cut at a crossing still meet exactly there.
function mergeClosePoints(line: readonly Point[]) {
    const kept: Point[] = [];
    let lastSkipped: Point | undefined;

    for (const point of line) {
        const last = kept.at(-1);
        if (last !== undefined && isClose(last, point)) {
            lastSkipped = point;
            continue;
        }

        kept.push(point);
        lastSkipped = undefined;
    }

    if (lastSkipped !== undefined && kept.length > 1) {
        kept[kept.length - 1] = lastSkipped;
    }
    if (kept.length < 2) return [];

    return kept;
}

function segmentStart(line: readonly Point[], segment: number) {
    const point = line[segment];
    if (point === undefined) throw new Error(`No segment ${segment} in a line of ${line.length} points.`);

    return point;
}

function segmentEnd(line: readonly Point[], segment: number) {
    return segmentStart(line, segment + 1);
}

function pointAlong(start: Point, end: Point, along: number) {
    if (along === 0) return start;
    if (along === 1) return end;

    const x = start.x + along * (end.x - start.x);
    const y = start.y + along * (end.y - start.y);

    return { x, y };
}

// Where two segments cross or touch, as a fraction along each. Parallel segments never count: one
// lying along the other can't be cut apart, and Box2D only needs chains that don't cross.
function crossing(first: readonly [Point, Point], second: readonly [Point, Point]) {
    const [a, b] = first;
    const [c, d] = second;
    const cSide = turn(a, b, c);
    const dSide = turn(a, b, d);
    const aSide = turn(c, d, a);
    const bSide = turn(c, d, b);

    if (cSide === dSide || aSide === bSide) return undefined;
    if (cSide * dSide > 0 || aSide * bSide > 0) return undefined;

    const alongFirst = aSide / (aSide - bSide);
    const alongSecond = cSide / (cSide - dSide);

    return { alongFirst, alongSecond };
}

function lastSegment(line: readonly Point[]) {
    return line.length - 2;
}

// The end of one segment is the start of the next, so a cut there is written one way only. The line's
// own two ends are never cuts.
function makeCut(line: readonly Point[], segment: number, along: number, point: Point): Cut | undefined {
    const isLineStart = segment === 0 && along === 0;
    const isLineEnd = segment === lastSegment(line) && along === 1;
    if (isLineStart || isLineEnd) return undefined;
    if (along === 1) return { segment: segment + 1, along: 0, point };

    return { segment, along, point };
}

function cutsOfSegments(line: readonly Point[], first: number, second: number) {
    const firstSegment = [segmentStart(line, first), segmentEnd(line, first)] as const;
    const secondSegment = [segmentStart(line, second), segmentEnd(line, second)] as const;
    const found = crossing(firstSegment, secondSegment);
    if (found === undefined) return [];

    // Both cuts share one point, so the chains meet exactly. Where it is one of the line's points, that
    // point is used as it is; otherwise it is worked out along the earlier segment.
    const secondTouches = found.alongSecond === 0 || found.alongSecond === 1;
    const point = secondTouches
        ? pointAlong(secondSegment[0], secondSegment[1], found.alongSecond)
        : pointAlong(firstSegment[0], firstSegment[1], found.alongFirst);
    const cuts = [makeCut(line, first, found.alongFirst, point), makeCut(line, second, found.alongSecond, point)];

    return cuts.filter((cut) => cut !== undefined);
}

function compareCuts(first: Cut, second: Cut) {
    if (first.segment !== second.segment) return first.segment - second.segment;

    return first.along - second.along;
}

function isSamePlace(first: Cut, second: Cut) {
    return first.segment === second.segment && first.along === second.along;
}

// Every pair of segments that aren't neighbours. Neighbours always touch at their shared point, which
// isn't a crossing.
function findCuts(line: readonly Point[]) {
    const cuts: Cut[] = [];

    for (let first = 0; first < lastSegment(line); first++) {
        for (let second = first + 2; second <= lastSegment(line); second++) {
            cuts.push(...cutsOfSegments(line, first, second));
        }
    }

    cuts.sort(compareCuts);

    return cuts.filter((cut, position) => {
        const previous = cuts[position - 1];

        return previous === undefined || !isSamePlace(previous, cut);
    });
}

// Walks the line and starts a new chain at every cut. A cut at a segment's start is the line's point
// itself; one inside a segment adds the crossing point.
function splitAtCuts(line: readonly Point[], cuts: readonly Cut[]) {
    const chains: Point[][] = [];
    let chain: Point[] = [];
    let nextCut = 0;

    for (let segment = 0; segment <= lastSegment(line); segment++) {
        chain.push(segmentStart(line, segment));

        for (let cut = cuts[nextCut]; cut?.segment === segment; cut = cuts[nextCut]) {
            if (cut.along === 0) {
                chain.pop();
            }

            chain.push(cut.point);
            chains.push(chain);
            chain = [cut.point];
            nextCut++;
        }
    }

    chain.push(segmentEnd(line, lastSegment(line)));
    chains.push(chain);

    return chains;
}

// Turns a line's points into Box2D chains, in the line's own space: points closer than 0.25 px merged,
// and the line cut at each place it crosses or touches itself, because a chain can't cross itself. Each
// chain has 2 points or more. The Box2D adapter adds each chain twice, once reversed, so the line
// collides from both sides. Uses only + - x / and comparisons, so every computer gives the same chains.
export class LineChains {
    static build(points: readonly Point[]): readonly (readonly Point[])[] {
        const line = mergeClosePoints(points);
        if (line.length === 0) return [];

        const cuts = findCuts(line);
        const chains = splitAtCuts(line, cuts).map(mergeClosePoints);

        return chains.filter((chain) => chain.length > 0);
    }
}
