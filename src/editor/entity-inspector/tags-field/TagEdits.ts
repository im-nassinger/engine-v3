import { wordName } from '../../../core/fields/index.ts';

// What the tags field commits: an entity's tags with one more, or one fewer. Each entity of a selection
// gets its own list changed, so a tag added to entities with different tags keeps each one's others.
export class TagEdits {
    // The tag typed, made a tag, added at the end. undefined when nothing is left of it.
    static typedTag(typed: string) {
        const tag = wordName(typed);
        if (tag === '') return undefined;

        return tag;
    }

    static withTag(tags: unknown, tag: string) {
        const held = TagEdits.tagsOf(tags);
        if (held.includes(tag)) return held;

        return [...held, tag];
    }

    static withoutTag(tags: unknown, tag: string) {
        const held = TagEdits.tagsOf(tags);

        return held.filter((heldTag) => heldTag !== tag);
    }

    private static tagsOf(tags: unknown): readonly string[] {
        if (!Array.isArray(tags)) return [];

        return tags.filter((tag) => typeof tag === 'string');
    }
}
