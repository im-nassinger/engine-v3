import type { FieldType } from '../../../core/fields/index.ts';

// The new list a list field's + or a row's remove or edit commits. Each gives a fresh list; the edit
// checks the limits, so going under minItems is refused there with its reason.
export class ListItems {
    // A copy of the last item, at the end: always valid, and where the user is already looking.
    static withCopyOfLast<T>(items: readonly T[], itemType: FieldType<T>) {
        const copied = items.map((item) => itemType.clone(item));
        const last = items.at(-1);
        if (last === undefined) return copied;

        const copyOfLast = itemType.clone(last);
        copied.push(copyOfLast);

        return copied;
    }

    static without<T>(items: readonly T[], index: number, itemType: FieldType<T>) {
        const kept = items.filter((_item, itemIndex) => itemIndex !== index);

        return kept.map((item) => itemType.clone(item));
    }

    static withItem<T>(items: readonly T[], index: number, newItem: T, itemType: FieldType<T>) {
        return items.map((item, itemIndex) => {
            if (itemIndex === index) return newItem;

            return itemType.clone(item);
        });
    }
}
