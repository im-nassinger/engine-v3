import { describe, expect, test } from 'vitest';

import { TagsFieldType } from './TagsFieldType.ts';

describe('TagsFieldType', () => {
    const tagsType = new TagsFieldType();

    test('its kind is tags', () => {
        expect(tagsType.kind).toBe('tags');
    });

    test('parse reads a list of texts, and serialize writes it back', () => {
        const parsed = tagsType.parse(['coin', 'pickup']);

        expect(parsed).toEqual({ ok: true, value: ['coin', 'pickup'] });
        expect(tagsType.serialize(['coin', 'pickup'])).toEqual(['coin', 'pickup']);
    });

    test('parse refuses anything but a list of texts', () => {
        const refusal = { ok: false, problem: { reason: 'wrongType' } };

        expect(tagsType.parse('coin')).toEqual(refusal);
        expect(tagsType.parse(['coin', 3])).toEqual(refusal);
        expect(tagsType.parse({ 0: 'coin' })).toEqual(refusal);
    });

    test('normalize makes each tag one lowercase word of letters, digits and `_`', () => {
        expect(tagsType.normalize(['Coin', 'Flying Boss', 'a-b!'])).toEqual(['coin', 'flying_boss', 'ab']);
    });

    test('normalize cuts a tag at 32 characters and drops one left empty', () => {
        const long = 'b'.repeat(33);

        expect(tagsType.normalize([long, '', '  ', '?!'])).toEqual(['b'.repeat(32)]);
    });

    test('normalize keeps the first of two equal tags', () => {
        expect(tagsType.normalize(['coin', 'player', 'COIN'])).toEqual(['coin', 'player']);
    });

    test('equals compares the tags in order, and clone copies the list', () => {
        const tags = ['coin', 'pickup'];
        const copy = tagsType.clone(tags);

        expect(copy).not.toBe(tags);
        expect(tagsType.equals(copy, tags)).toBe(true);
        expect(tagsType.equals(['pickup', 'coin'], tags)).toBe(false);
        expect(tagsType.equals(['coin'], tags)).toBe(false);
    });
});
