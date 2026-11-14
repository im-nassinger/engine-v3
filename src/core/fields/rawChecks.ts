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

export function clamp(value: number, min: number, max: number) {
    if (value < min) return min;
    if (value > max) return max;

    return value;
}
