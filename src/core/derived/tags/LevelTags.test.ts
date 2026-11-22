import { describe, expect, test } from 'vitest';

import { TagsComponent } from '../../components/index.ts';
import { Level } from '../../level/index.ts';

import { LevelTags } from './LevelTags.ts';

function levelWithTags(...tagLists: string[][]) {
    const level = Level.createNew();

    for (const tags of tagLists) {
        const entity = level.createEntity(level.world, 0);
        entity.addComponent(new TagsComponent({ tags }));
    }

    return level;
}

describe('LevelTags', () => {
    test('lists every tag in the level once, A to Z', () => {
        const level = levelWithTags(['player'], ['coin', 'pickup'], ['coin']);

        expect(LevelTags.of(level)).toEqual(['coin', 'pickup', 'player']);
    });

    test("reads the World's tags too, and is empty in a level without any", () => {
        const level = Level.createNew();
        const empty = LevelTags.of(level);
        level.world.addComponent(new TagsComponent({ tags: ['arena'] }));

        expect(empty).toEqual([]);
        expect(LevelTags.of(level)).toEqual(['arena']);
    });

    test('matching gives the tags that start with what is typed, made a tag, but the ones held', () => {
        const levelTags = ['coin', 'coin_big', 'enemy', 'player'];

        expect(LevelTags.matching(levelTags, 'Co', [])).toEqual(['coin', 'coin_big']);
        expect(LevelTags.matching(levelTags, 'coin ', ['coin'])).toEqual(['coin_big']);
        expect(LevelTags.matching(levelTags, 'coin b', [])).toEqual(['coin_big']);
        expect(LevelTags.matching(levelTags, '', [])).toEqual([]);
        expect(LevelTags.matching(levelTags, '!', [])).toEqual([]);
    });
});
