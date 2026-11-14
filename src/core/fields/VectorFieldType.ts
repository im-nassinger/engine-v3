import type { Point } from '../geometry/index.ts';

import type { FieldType } from './FieldType.ts';
import type { ParseOutcome } from './ParseOutcome.ts';
import { accept, clamp, parsePoint, refuse } from './rawChecks.ts';

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
        const parsed = parsePoint(raw);
        if (!parsed.ok) return parsed;

        const hasZero = parsed.value.x === 0 || parsed.value.y === 0;
        if (this.refuseZero && hasZero) return refuse({ reason: 'zero' });

        return accept(parsed.value);
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
