import type { FieldType } from '../FieldType.ts';
import type { ParseOutcome } from '../ParseOutcome.ts';
import { accept, clamp, parseFiniteNumber, refuse } from '../rawChecks.ts';

export type AngleFieldOptions = {
    readonly min?: number;
    readonly max?: number;
    // Refuses min, max and anything past them instead of clamping. Skew uses it: at 90 degrees there is no tangent.
    readonly refuseLimits?: boolean;
};

// Degrees.
export class AngleFieldType implements FieldType<number> {
    readonly kind = 'angle';
    readonly min: number | undefined;
    readonly max: number | undefined;
    readonly refuseLimits: boolean;

    constructor(options: AngleFieldOptions = {}) {
        this.min = options.min;
        this.max = options.max;
        this.refuseLimits = options.refuseLimits ?? false;

        const hasBothLimits = this.min !== undefined && this.max !== undefined;
        if (this.refuseLimits && !hasBothLimits) {
            throw new Error('An angle field that refuses its limits needs both a min and a max.');
        }
    }

    parse(raw: unknown): ParseOutcome<number> {
        const parsed = parseFiniteNumber(raw);
        if (!parsed.ok) return parsed;
        if (!this.refuseLimits) return parsed;

        const min = this.min ?? -Infinity;
        const max = this.max ?? Infinity;
        const isInsideLimits = parsed.value > min && parsed.value < max;
        if (!isInsideLimits) return refuse({ reason: 'outsideLimits', min, max });

        return accept(parsed.value);
    }

    serialize(value: number) {
        return value;
    }

    // A field that refuses its limits never clamps: parse is what keeps its values inside.
    normalize(value: number) {
        if (this.refuseLimits) return value;

        const min = this.min ?? -Infinity;
        const max = this.max ?? Infinity;
        return clamp(value, min, max);
    }

    clone(value: number) {
        return value;
    }

    equals(first: number, second: number) {
        return first === second;
    }
}
