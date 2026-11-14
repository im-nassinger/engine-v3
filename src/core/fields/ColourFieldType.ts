import type { FieldType } from './FieldType.ts';
import type { ParseOutcome } from './ParseOutcome.ts';
import { accept, refuse } from './rawChecks.ts';

const COLOUR_PATTERN = /^#[0-9A-Fa-f]{8}$/;

// #RRGGBBAA text. Lowercase digits are read, and stored uppercase.
export class ColourFieldType implements FieldType<string> {
    readonly kind = 'colour';

    parse(raw: unknown): ParseOutcome<string> {
        if (typeof raw !== 'string') return refuse({ reason: 'wrongType' });
        if (!COLOUR_PATTERN.test(raw)) return refuse({ reason: 'badColour' });

        return accept(raw);
    }

    serialize(value: string) {
        return value;
    }

    normalize(value: string) {
        return value.toUpperCase();
    }

    clone(value: string) {
        return value;
    }

    equals(first: string, second: string) {
        return first === second;
    }
}
