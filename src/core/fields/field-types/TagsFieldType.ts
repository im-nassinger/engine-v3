import type { FieldType } from '../FieldType.ts';
import { wordName } from '../names/wordName.ts';
import type { ParseOutcome } from '../ParseOutcome.ts';
import { accept, refuse } from '../rawChecks.ts';

// An entity's tags, such as `["coin", "pickup"]`. parse checks it is a list of texts; normalize makes each
// one a word name, drops the ones left empty and keeps the first of two equal tags.
export class TagsFieldType implements FieldType<readonly string[]> {
    readonly kind = 'tags';

    parse(raw: unknown): ParseOutcome<readonly string[]> {
        if (!Array.isArray(raw)) return refuse({ reason: 'wrongType' });

        const tags: string[] = [];
        for (const rawTag of raw) {
            if (typeof rawTag !== 'string') return refuse({ reason: 'wrongType' });

            tags.push(rawTag);
        }

        return accept(tags);
    }

    serialize(value: readonly string[]) {
        return [...value];
    }

    normalize(value: readonly string[]) {
        const tags: string[] = [];

        for (const typed of value) {
            const tag = wordName(typed);
            if (tag === '' || tags.includes(tag)) continue;

            tags.push(tag);
        }

        return tags;
    }

    clone(value: readonly string[]) {
        return [...value];
    }

    equals(first: readonly string[], second: readonly string[]) {
        if (first.length !== second.length) return false;

        return first.every((tag, index) => tag === second[index]);
    }
}
