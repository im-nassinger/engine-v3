import type { Point } from '../geometry/index.ts';

import type { FieldType } from './FieldType.ts';
import type { ParseOutcome } from './ParseOutcome.ts';
import { accept, clamp, hasExactlyKeys, isPlainObject, parseFiniteNumber, refuse } from './rawChecks.ts';

export type VectorFieldOptions = {
    // Each applies to x and y alike.
    readonly min?: number;
    readonly max?: number;
    // Refuses a vector with x or y at 0. Scale uses it: a scale of 0 in either direction can't be undone.
    readonly refuseZero?: boolean;
};

export class VectorFieldType implements FieldType<Point> {
    readonly kind = 'vector';
    readonly min: number | undefined;
    readonly max: number | undefined;
    readonly refuseZero: boolean;

    constructor(options: VectorFieldOptions = {}) {
        this.min = options.min;
        this.max = options.max;
        this.refuseZero = options.refuseZero ?? false;
    }

    parse(raw: unknown): ParseOutcome<Point> {
        if (!isPlainObject(raw)) return refuse({ reason: 'wrongType' });
        if (!hasExactlyKeys(raw, ['x', 'y'])) return refuse({ reason: 'wrongType' });

        const parsedX = parseFiniteNumber(raw['x']);
        if (!parsedX.ok) return parsedX;

        const parsedY = parseFiniteNumber(raw['y']);
        if (!parsedY.ok) return parsedY;

        const hasZero = parsedX.value === 0 || parsedY.value === 0;
        if (this.refuseZero && hasZero) return refuse({ reason: 'zero' });

        return accept({ x: parsedX.value, y: parsedY.value });
    }

    serialize(value: Point) {
        return { x: value.x, y: value.y };
    }

    normalize(value: Point) {
        const min = this.min ?? -Infinity;
        const max = this.max ?? Infinity;
        const x = clamp(value.x, min, max);
        const y = clamp(value.y, min, max);

        return { x, y };
    }

    clone(value: Point) {
        return { x: value.x, y: value.y };
    }

    equals(first: Point, second: Point) {
        return first.x === second.x && first.y === second.y;
    }
}
