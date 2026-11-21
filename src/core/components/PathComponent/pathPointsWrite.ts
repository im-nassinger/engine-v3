import { oppositeHandle, smoothHandles } from '../../geometry/index.ts';
import type { PathGeometry, PathPoint, Point } from '../../geometry/index.ts';

type Handles = {
    readonly handleIn: Point | null;
    readonly handleOut: Point | null;
};

function sameHandle(first: Point | null, second: Point | null) {
    if (first === null || second === null) return first === second;

    return first.x === second.x && first.y === second.y;
}

// A smooth point keeps its handles on one line: the one typed stays, and the other turns opposite it,
// keeping its own length. A separate point turned smooth lines its handle out up with its handle in.
function keptOpposite(old: PathPoint | undefined, point: PathPoint): Handles {
    const { handleIn, handleOut } = point;
    if (point.corner !== 'smooth' || old === undefined) return { handleIn, handleOut };
    if (handleIn === null || handleOut === null) return { handleIn, handleOut };

    const inMoved = !sameHandle(old.handleIn, handleIn);
    const outMoved = !sameHandle(old.handleOut, handleOut);
    if (old.corner === 'separate' || (inMoved && !outMoved)) {
        return { handleIn, handleOut: oppositeHandle(handleIn, handleOut) };
    }
    if (outMoved && !inMoved) return { handleIn: oppositeHandle(handleOut, handleIn), handleOut };

    return { handleIn, handleOut };
}

// The handles a curved point needs where it stands: none before an open path's first point or after its
// last, and both everywhere else. A missing one comes from smoothHandles, turned opposite the other on a
// smooth point that kept one.
function placedHandles(path: PathGeometry, index: number, point: PathPoint, handles: Handles): Handles {
    const last = path.points.length - 1;
    const needsIn = path.closed || index > 0;
    const needsOut = path.closed || index < last;
    const handleIn = needsIn ? handles.handleIn : null;
    const handleOut = needsOut ? handles.handleOut : null;

    const lacksIn = needsIn && handleIn === null;
    const lacksOut = needsOut && handleOut === null;
    if (!lacksIn && !lacksOut) return { handleIn, handleOut };

    const given = smoothHandles(path, index);
    const isSmooth = point.corner === 'smooth';
    const newIn = lacksIn ? keptOppositeOf(isSmooth, handleOut, given.handleIn) : handleIn;
    const newOut = lacksOut ? keptOppositeOf(isSmooth, handleIn, given.handleOut) : handleOut;

    return { handleIn: newIn, handleOut: newOut };
}

// A handle smoothHandles gave, turned opposite the other on a smooth point that kept that one.
function keptOppositeOf(isSmooth: boolean, kept: Point | null, given: Point | null) {
    if (!isSmooth || kept === null || given === null) return given;

    return oppositeHandle(kept, given);
}

// The path a typed Points list gives: a sharp point has no handles (the point type drops them), and a
// smooth or separate one has those its place needs, so choosing Smooth on a sharp point gives it handles.
export function pathWithPoints(old: PathGeometry, points: readonly PathPoint[]): PathGeometry {
    const typed: PathGeometry = { closed: old.closed, points };

    const placed = points.map((point, index) => {
        if (point.corner === 'sharp') return point;

        const kept = keptOpposite(old.points[index], point);
        const handles = placedHandles(typed, index, point, kept);

        return { ...point, ...handles };
    });

    return { closed: old.closed, points: placed };
}
