import type { CubicCurve } from '../path/cubicCurve.ts';
import { pointOnCubic } from '../path/cubicCurve.ts';
import type { Point } from '../Point.ts';

import { add, distance, distanceSquared, dot, subtract, times, withLength } from './vectors.ts';

// Schneider's An Algorithm for Automatically Fitting Digitized Curves (Graphics Gems, 1990), as Paper.js's
// simplify writes it.

const EPSILON = 1e-12;
const REPARAMETERIZE_ROUNDS = 4;

type WorstPoint = {
    readonly errorSquared: number;
    readonly index: number;
};

// Fits the points from first to last, inclusive, adding the curves to the end of fitted. The tangents are
// directions: at the start into the drag, at the end back into it.
export function fitCubic(
    points: readonly Point[],
    first: number,
    last: number,
    startTangent: Point,
    endTangent: Point,
    toleranceSquared: number,
    fitted: CubicCurve[],
) {
    const start = points[first] as Point;
    const end = points[last] as Point;

    if (last - first === 1) {
        const handleLength = distance(start, end) / 3;
        fitted.push(curveWithHandles(start, end, startTangent, endTangent, handleLength, handleLength));
        return;
    }

    const shares = chordLengthShares(points, first, last);
    let split = first + Math.floor((last - first) / 2);
    let sharesInOrder = true;
    let giveUpAbove = Math.max(toleranceSquared, toleranceSquared * toleranceSquared);

    for (let round = 0; round <= REPARAMETERIZE_ROUNDS; round++) {
        const curve = generateCurve(points, first, last, shares, startTangent, endTangent);
        const worst = findWorstPoint(points, first, last, curve, shares);

        if (worst.errorSquared < toleranceSquared && sharesInOrder) {
            fitted.push(curve);
            return;
        }

        split = keptInMiddle(worst.index, first, last);
        if (worst.errorSquared >= giveUpAbove) break;

        sharesInOrder = reparameterize(points, first, last, shares, curve);
        giveUpAbove = worst.errorSquared;
    }

    const splitTangent = tangentAt(points, split);
    const backwards = times(splitTangent, -1);

    fitCubic(points, first, split, startTangent, splitTangent, toleranceSquared, fitted);
    fitCubic(points, split, last, backwards, endTangent, toleranceSquared, fitted);
}

// On a noisy drag the worst point often lies next to an end, and splitting there peels off one point at a
// time, which takes seconds on a few thousand points. Kept in the middle half, the splits stay balanced; the
// halves are still fitted until within the tolerance, so only the place of a cut changes.
function keptInMiddle(index: number, first: number, last: number) {
    const quarter = Math.floor((last - first) / 4);
    const lowest = first + quarter;
    const highest = last - quarter;

    return Math.min(highest, Math.max(lowest, index));
}

// The direction back along the drag at a split, from the point after it to the point before: the two halves
// share it, so the point they meet at is smooth.
export function tangentAt(points: readonly Point[], index: number) {
    const before = points[index - 1] as Point;
    const at = points[index] as Point;
    const after = points[index + 1] as Point;

    const across = subtract(before, after);
    if (dot(across, across) > 0) return across;

    // The drag went out and came back the same way: the step before still has a direction.
    return subtract(before, at);
}

function curveWithHandles(
    start: Point,
    end: Point,
    startTangent: Point,
    endTangent: Point,
    startLength: number,
    endLength: number,
): CubicCurve {
    const firstHandle = withLength(startTangent, startLength);
    const secondHandle = withLength(endTangent, endLength);

    return { start, firstControl: add(start, firstHandle), secondControl: add(end, secondHandle), end };
}

// Each point's share of the way along the drag, by the lengths of its steps.
function chordLengthShares(points: readonly Point[], first: number, last: number) {
    const shares = [0];

    for (let i = first + 1; i <= last; i++) {
        const step = distance(points[i] as Point, points[i - 1] as Point);
        const before = shares[i - first - 1] as number;
        shares.push(before + step);
    }

    const total = shares[last - first] as number;
    for (let i = 1; i < shares.length; i++) {
        shares[i] = (shares[i] as number) / total;
    }

    return shares;
}

// The least-squares handle lengths along the two tangents, for the points at their shares.
function generateCurve(
    points: readonly Point[],
    first: number,
    last: number,
    shares: readonly number[],
    startTangent: Point,
    endTangent: Point,
) {
    const start = points[first] as Point;
    const end = points[last] as Point;
    let c00 = 0;
    let c01 = 0;
    let c11 = 0;
    let x0 = 0;
    let x1 = 0;

    for (let i = 0; i <= last - first; i++) {
        const share = shares[i] as number;
        const rest = 1 - share;
        const middle = 3 * share * rest;
        const b0 = rest * rest * rest;
        const b1 = middle * rest;
        const b2 = middle * share;
        const b3 = share * share * share;

        const a1 = withLength(startTangent, b1);
        const a2 = withLength(endTangent, b2);
        const fromEnds = add(times(start, b0 + b1), times(end, b2 + b3));
        const remainder = subtract(points[first + i] as Point, fromEnds);

        c00 += dot(a1, a1);
        c01 += dot(a1, a2);
        c11 += dot(a2, a2);
        x0 += dot(a1, remainder);
        x1 += dot(a2, remainder);
    }

    let startLength: number;
    let endLength: number;
    const determinant = c00 * c11 - c01 * c01;

    if (Math.abs(determinant) > EPSILON) {
        startLength = (x0 * c11 - x1 * c01) / determinant;
        endLength = (c00 * x1 - c01 * x0) / determinant;
    } else {
        const startSum = c00 + c01;
        const endSum = c01 + c11;
        startLength = 0;
        if (Math.abs(startSum) > EPSILON) {
            startLength = x0 / startSum;
        } else if (Math.abs(endSum) > EPSILON) {
            startLength = x1 / endSum;
        }
        endLength = startLength;
    }

    const chord = distance(start, end);
    const fallbackLength = chord / 3;
    const tooShort = chord * EPSILON;

    if (startLength < tooShort || endLength < tooShort) {
        return curveWithHandles(start, end, startTangent, endTangent, fallbackLength, fallbackLength);
    }

    // Handles that reach past each other make a loop the drag never had.
    const line = subtract(end, start);
    const firstHandle = withLength(startTangent, startLength);
    const secondHandle = withLength(endTangent, endLength);
    const reach = dot(firstHandle, line) - dot(secondHandle, line);
    if (reach > chord * chord) {
        return curveWithHandles(start, end, startTangent, endTangent, fallbackLength, fallbackLength);
    }

    return curveWithHandles(start, end, startTangent, endTangent, startLength, endLength);
}

function findWorstPoint(
    points: readonly Point[],
    first: number,
    last: number,
    curve: CubicCurve,
    shares: readonly number[],
): WorstPoint {
    let worst = { errorSquared: 0, index: first + Math.floor((last - first + 1) / 2) };

    for (let i = first + 1; i < last; i++) {
        const onCurve = pointOnCubic(curve, shares[i - first] as number);
        const errorSquared = distanceSquared(onCurve, points[i] as Point);
        if (errorSquared >= worst.errorSquared) {
            worst = { errorSquared, index: i };
        }
    }

    return worst;
}

// Moves each share to where the curve comes nearest its point, by one Newton-Raphson step. False when the
// shares are no longer in order, which a fit can't be accepted with.
function reparameterize(points: readonly Point[], first: number, last: number, shares: number[], curve: CubicCurve) {
    for (let i = first; i <= last; i++) {
        shares[i - first] = findRoot(curve, points[i] as Point, shares[i - first] as number);
    }

    for (let i = 1; i < shares.length; i++) {
        if ((shares[i] as number) <= (shares[i - 1] as number)) return false;
    }

    return true;
}

function findRoot(curve: CubicCurve, point: Point, share: number) {
    const { start, firstControl, secondControl, end } = curve;
    const d0 = times(subtract(firstControl, start), 3);
    const d1 = times(subtract(secondControl, firstControl), 3);
    const d2 = times(subtract(end, secondControl), 3);
    const dd0 = times(subtract(d1, d0), 2);
    const dd1 = times(subtract(d2, d1), 2);

    const onCurve = pointOnCubic(curve, share);
    const velocity = quadraticAt(d0, d1, d2, share);
    const acceleration = add(times(dd0, 1 - share), times(dd1, share));
    const difference = subtract(onCurve, point);

    const slope = dot(velocity, velocity) + dot(difference, acceleration);
    if (Math.abs(slope) < EPSILON) return share;

    return share - dot(difference, velocity) / slope;
}

function quadraticAt(a: Point, b: Point, c: Point, share: number) {
    const rest = 1 - share;
    const fromA = times(a, rest * rest);
    const fromB = times(b, 2 * rest * share);
    const fromC = times(c, share * share);

    return add(add(fromA, fromB), fromC);
}
