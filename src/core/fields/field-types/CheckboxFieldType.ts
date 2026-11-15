import type { FieldType } from '../FieldType.ts';
import type { ParseOutcome } from '../ParseOutcome.ts';
import { accept, refuse } from '../rawChecks.ts';

export class CheckboxFieldType implements FieldType<boolean> {
    readonly kind = 'checkbox';

    parse(raw: unknown): ParseOutcome<boolean> {
        if (typeof raw !== 'boolean') return refuse({ reason: 'wrongType' });

        return accept(raw);
    }

    serialize(value: boolean) {
        return value;
    }

    normalize(value: boolean) {
        return value;
    }

    clone(value: boolean) {
        return value;
    }

    equals(first: boolean, second: boolean) {
        return first === second;
    }
}
