import { describe, expect, test } from 'vitest';

import { TagsComponent } from './TagsComponent.ts';

describe('TagsComponent', () => {
    test('a new one has no tags, and its card is the 11th', () => {
        const tags = new TagsComponent();

        expect(tags.get('tags')).toEqual([]);
        expect(TagsComponent.schema.cardOrder).toBe(11);
        expect(TagsComponent.schema.hasCard).toBe(true);
    });

    test('a written tag is made lowercase, with its spaces as `_`, and kept once', () => {
        const tags = new TagsComponent();

        tags.writeValue('tags', ['Coin', 'flying boss', 'coin']);

        expect(tags.get('tags')).toEqual(['coin', 'flying_boss']);
    });

    test('anything but a list of texts is refused and the tags stay', () => {
        const tags = new TagsComponent({ tags: ['coin'] });

        expect(tags.writeValue('tags', 'player')).toEqual({ ok: false, problem: { reason: 'wrongType' } });
        expect(tags.get('tags')).toEqual(['coin']);
    });

    test('any entity can be given one by hand, and its tags can change during play', () => {
        const [tagsField] = TagsComponent.schema.fields;

        expect(TagsComponent.schema.addableByHand).toBe(true);
        expect(TagsComponent.schema.addMenuSection).toBe('Logic');
        expect(tagsField?.changeableInPlay).toBe(true);
    });
});
