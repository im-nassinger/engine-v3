import type { FieldType } from './FieldType.ts';
import type { ParseOutcome } from './ParseOutcome.ts';
import { accept, refuse } from './rawChecks.ts';

export type TextFieldOptions = {
    // Counted in characters (code points), so a character outside the basic plane is never cut in half.
    readonly maxLength?: number;
    readonly trimmed?: boolean;
};

export class TextFieldType implements FieldType<string> {
    readonly kind = 'text';
    readonly maxLength: number | undefined;
    readonly trimmed: boolean;

    constructor(options: TextFieldOptions = {}) {
        this.maxLength = options.maxLength;
        this.trimmed = options.trimmed ?? false;
    }

    parse(raw: unknown): ParseOutcome<string> {
        if (typeof raw !== 'string') return refuse({ reason: 'wrongType' });

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
