import type { FieldType } from '../FieldType.ts';
import type { ParseOutcome } from '../ParseOutcome.ts';
import { accept, refuse } from '../rawChecks.ts';

export type ListFieldOptions<T> = {
    readonly itemType: FieldType<T>;
    readonly minItems?: number;
    readonly maxItems?: number;
};

// A list of values of one field type, such as a polygon's Points. Refused whole when one item is wrong.
export class ListFieldType<T> implements FieldType<T[]> {
    readonly kind = 'list';
    readonly itemType: FieldType<T>;
    readonly minItems: number;
    readonly maxItems: number;

    constructor(options: ListFieldOptions<T>) {
        this.itemType = options.itemType;
        this.minItems = options.minItems ?? 0;
        this.maxItems = options.maxItems ?? Infinity;
    }

    parse(raw: unknown): ParseOutcome<T[]> {
        if (!Array.isArray(raw)) return refuse({ reason: 'wrongType' });
        if (raw.length < this.minItems) return refuse({ reason: 'tooFewItems', minCount: this.minItems });
        if (raw.length > this.maxItems) return refuse({ reason: 'tooManyItems', maxCount: this.maxItems });

        const items: T[] = [];
        for (const rawItem of raw) {
            const parsed = this.itemType.parse(rawItem);
            if (!parsed.ok) return parsed;

            items.push(parsed.value);
        }

        return accept(items);
    }

    serialize(value: T[]) {
        return value.map((item) => this.itemType.serialize(item));
    }

    normalize(value: T[]) {
        return value.map((item) => this.itemType.normalize(item));
    }

    clone(value: T[]) {
        return value.map((item) => this.itemType.clone(item));
    }

    equals(first: T[], second: T[]) {
        if (first.length !== second.length) return false;

        return first.every((item, index) => {
            const other = second[index];
            if (other === undefined) return false;

            return this.itemType.equals(item, other);
        });
    }
}
