import { ColourFieldType } from './ColourFieldType.ts';
import type { FieldType } from '../FieldType.ts';
import type { JsonValue } from '../JsonValue.ts';
import type { ParseOutcome } from '../ParseOutcome.ts';
import { accept, hasExactlyKeys, isPlainObject, refuse } from '../rawChecks.ts';
import type { SolidFill } from '../SolidFill.ts';

const colourType = new ColourFieldType();

// Shown as a colour field that can be emptied. Its kind is 'fill', not 'colour', because the colour
// control reads text and this value is tagged. v2's FillFieldType takes the same kind over.
export class SolidFillFieldType implements FieldType<SolidFill> {
    readonly kind = 'fill';

    parse(raw: unknown): ParseOutcome<SolidFill> {
        if (!isPlainObject(raw)) return refuse({ reason: 'wrongType' });

        const isNone = raw['kind'] === 'none' && hasExactlyKeys(raw, ['kind']);
        if (isNone) return accept({ kind: 'none' });

        const isSolid = raw['kind'] === 'solid' && hasExactlyKeys(raw, ['kind', 'colour']);
        if (!isSolid) return refuse({ reason: 'wrongType' });

        const parsedColour = colourType.parse(raw['colour']);
        if (!parsedColour.ok) return parsedColour;

        return accept({ kind: 'solid', colour: parsedColour.value });
    }

    serialize(value: SolidFill): JsonValue {
        if (value.kind === 'none') return { kind: 'none' };

        return { kind: 'solid', colour: value.colour };
    }

    normalize(value: SolidFill): SolidFill {
        if (value.kind === 'none') return value;

        const colour = colourType.normalize(value.colour);
        return { kind: 'solid', colour };
    }

    clone(value: SolidFill): SolidFill {
        return { ...value };
    }

    equals(first: SolidFill, second: SolidFill) {
        if (first.kind === 'none' || second.kind === 'none') return first.kind === second.kind;

        return first.colour === second.colour;
    }
}
