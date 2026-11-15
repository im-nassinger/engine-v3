import type { FieldType } from '../FieldType.ts';
import { clamp, parseFiniteNumber } from '../rawChecks.ts';

export type NumberFieldOptions = {
    readonly min?: number;
    readonly max?: number;
    readonly wholeNumber?: boolean;
};

export class NumberFieldType implements FieldType<number> {
    readonly kind = 'number';
    readonly min: number | undefined;
    readonly max: number | undefined;
    readonly wholeNumber: boolean;

    constructor(options: NumberFieldOptions = {}) {
        this.min = options.min;
        this.max = options.max;
        this.wholeNumber = options.wholeNumber ?? false;
    }

    parse(raw: unknown) {
        return parseFiniteNumber(raw);
    }

    serialize(value: number) {
        return value;
    }

    normalize(value: number) {
        let normalized = value;
        if (this.wholeNumber) {
            normalized = Math.round(normalized);
        }

        const min = this.min ?? -Infinity;
        const max = this.max ?? Infinity;
        return clamp(normalized, min, max);
    }

    clone(value: number) {
        return value;
    }

    equals(first: number, second: number) {
        return first === second;
    }
}
