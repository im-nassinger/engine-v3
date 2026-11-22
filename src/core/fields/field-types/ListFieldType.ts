import type { FieldType } from '../FieldType.ts';
import type { ParseOutcome } from '../ParseOutcome.ts';
import { accept, refuse } from '../rawChecks.ts';

export type ListFieldOptions<T> = {
    readonly itemType: FieldType<T>;
    readonly minItems?: number;
    readonly maxItems?: number;
    // For a list of named items, such as variables: parse refuses a second item with the same name, once
    // each item is normalized, so `Coins` and `coins` are the same name.
    readonly itemName?: (item: T) => string;
};

// A list of values of one field type, such as a polygon's Points. Refused whole when one item is wrong.
export class ListFieldType<T> implements FieldType<T[]> {
    readonly kind = 'list';
    readonly itemType: FieldType<T>;
    readonly minItems: number;
    readonly maxItems: number;
    readonly itemName: ((item: T) => string) | undefined;

    constructor(options: ListFieldOptions<T>) {
        this.itemType = options.itemType;
        this.minItems = options.minItems ?? 0;
        this.maxItems = options.maxItems ?? Infinity;
        this.itemName = options.itemName;
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

        const repeated = this.repeatedName(items);
        if (repeated !== undefined) return refuse({ reason: 'repeatedName', name: repeated });

        return accept(items);
    }

    // The first name two items share, once normalized; undefined when every name is unique or the items aren't named.
    private repeatedName(items: readonly T[]) {
        const { itemName } = this;
        if (itemName === undefined) return undefined;

        const names = new Set<string>();
        for (const item of items) {
            const name = itemName(this.itemType.normalize(item));
            if (names.has(name)) return name;

            names.add(name);
        }

        return undefined;
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
