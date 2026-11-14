import type { Point } from '../geometry/index.ts';

import type { ParseOutcome, ParseProblem } from './ParseOutcome.ts';

export function accept<T>(value: T): ParseOutcome<T> {
    return { ok: true, value };
}

export function refuse<T>(problem: ParseProblem): ParseOutcome<T> {
    return { ok: false, problem };
}

export function isPlainObject(raw: unknown): raw is Readonly<Record<string, unknown>> {
    if (typeof raw !== 'object' || raw === null) return false;
    if (Array.isArray(raw)) return false;

    const prototype: unknown = Object.getPrototypeOf(raw);
    return prototype === Object.prototype || prototype === null;
}

export function hasExactlyKeys(record: Readonly<Record<string, unknown>>, expectedKeys: readonly string[]) {
    const keys = Object.keys(record);
    if (keys.length !== expectedKeys.length) return false;

    return expectedKeys.every((key) => Object.hasOwn(record, key));
}

// A number from untrusted data: refused when it isn't a number, or is NaN or infinite.
export function parseFiniteNumber(raw: unknown): ParseOutcome<number> {
    if (typeof raw !== 'number') return refuse({ reason: 'wrongType' });
    if (!Number.isFinite(raw)) return refuse({ reason: 'notFinite' });

    return accept(raw);
}

// A point from untrusted data: exactly x and y, both finite.
export function parsePoint(raw: unknown): ParseOutcome<{ x: number; y: number }> {
    if (!isPlainObject(raw)) return refuse({ reason: 'wrongType' });
    if (!hasExactlyKeys(raw, ['x', 'y'])) return refuse({ reason: 'wrongType' });

    const parsedX = parseFiniteNumber(raw['x']);
    if (!parsedX.ok) return parsedX;

    const parsedY = parseFiniteNumber(raw['y']);
    if (!parsedY.ok) return parsedY;

    return accept({ x: parsedX.value, y: parsedY.value });
}

// A list of points from untrusted data, refused whole when one point is wrong.
export function parsePointList(raw: unknown, minCount: number): ParseOutcome<{ x: number; y: number }[]> {
    if (!Array.isArray(raw)) return refuse({ reason: 'wrongType' });
    if (raw.length < minCount) return refuse({ reason: 'tooFewPoints', minCount });

    const points: { x: number; y: number }[] = [];
    for (const rawPoint of raw) {
        const parsed = parsePoint(rawPoint);
        if (!parsed.ok) return parsed;

        points.push(parsed.value);
    }

    return accept(points);
}

export function pointsEqual(first: readonly Point[], second: readonly Point[]) {
    if (first.length !== second.length) return false;

    return first.every((point, index) => {
        const other = second[index];
        return other !== undefined && point.x === other.x && point.y === other.y;
    });
}

export function clamp(value: number, min: number, max: number) {
    if (value < min) return min;
    if (value > max) return max;

    return value;
}
