import type { FieldType } from '../FieldType.ts';
import type { ParseOutcome } from '../ParseOutcome.ts';
import { accept, refuse } from '../rawChecks.ts';

export type ChoiceOption<T extends string> = {
    readonly value: T;
    readonly label: string;
};

export class ChoiceFieldType<T extends string> implements FieldType<T> {
    readonly kind = 'choice';
    readonly options: readonly ChoiceOption<T>[];

    constructor(options: readonly ChoiceOption<T>[]) {
        if (options.length === 0) {
            throw new Error('A choice field needs at least one option.');
        }

        this.options = options;
    }

    parse(raw: unknown): ParseOutcome<T> {
        if (typeof raw !== 'string') return refuse({ reason: 'wrongType' });

        const matchingOption = this.options.find((option) => option.value === raw);
        if (matchingOption === undefined) return refuse({ reason: 'unknownChoice' });

        return accept(matchingOption.value);
    }

    serialize(value: T) {
        return value;
    }

    normalize(value: T) {
        return value;
    }

    clone(value: T) {
        return value;
    }

    equals(first: T, second: T) {
        return first === second;
    }
}
