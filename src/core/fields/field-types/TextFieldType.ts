import type { FieldType } from '../FieldType.ts';
import type { ParseOutcome } from '../ParseOutcome.ts';
import { accept, refuse } from '../rawChecks.ts';

export type TextFieldOptions = {
    // Refused by parse when shorter, counted after trimming: a name of only spaces is empty.
    readonly minLength?: number;
    // Counted in characters (code points), so a character outside the basic plane is never cut in half.
    readonly maxLength?: number;
    readonly trimmed?: boolean;
};

export class TextFieldType implements FieldType<string> {
    readonly kind = 'text';
    readonly minLength: number | undefined;
    readonly maxLength: number | undefined;
    readonly trimmed: boolean;

    constructor(options: TextFieldOptions = {}) {
        this.minLength = options.minLength;
        this.maxLength = options.maxLength;
        this.trimmed = options.trimmed ?? false;
    }

    parse(raw: unknown): ParseOutcome<string> {
        if (typeof raw !== 'string') return refuse({ reason: 'wrongType' });
        if (this.minLength === undefined) return accept(raw);

        const trimmedValue = this.trimIfAsked(raw);
        const characterCount = Array.from(trimmedValue).length;
        if (characterCount < this.minLength) return refuse({ reason: 'tooShort', minLength: this.minLength });

        return accept(raw);
    }

    serialize(value: string) {
        return value;
    }

    normalize(value: string) {
        const trimmedValue = this.trimIfAsked(value);
        if (this.maxLength === undefined) return trimmedValue;

        const characters = Array.from(trimmedValue);
        if (characters.length <= this.maxLength) return trimmedValue;

        const shortened = characters.slice(0, this.maxLength).join('');
        return this.trimIfAsked(shortened);
    }

    clone(value: string) {
        return value;
    }

    equals(first: string, second: string) {
        return first === second;
    }

    private trimIfAsked(value: string) {
        if (!this.trimmed) return value;

        return value.trim();
    }
}
