import { describe, expect, test } from 'vitest';

import { createV1Registry, NameComponent } from '../../../core/components/index.ts';
import type { EntityData } from '../../../core/level-data/index.ts';
import { FormatUpgrader, LevelReader, LevelWriter, V1_LEVEL_LIMITS } from '../../../core/level-data/index.ts';

import { AddEntitiesChange } from './AddEntitiesChange.ts';
import { buildChangesTestLevel, snapshotOf } from './changesTestLevel.ts';

const reader = new LevelReader(createV1Registry(), V1_LEVEL_LIMITS, FormatUpgrader.createV1());

// The group and its child as data under new ids, as paste will give them.
function groupWithNewIds(level: ReturnType<typeof buildChangesTestLevel>) {
    const [groupData, childData] = new LevelWriter().writeSubtree([level.group]);
    if (groupData === undefined || childData === undefined) throw new Error('The group was not written.');

    const entities: EntityData[] = [
        { ...groupData, id: 100 },
        { ...childData, id: 101, parent: 100 },
    ];

    return entities;
}

describe('AddEntitiesChange', () => {
    test('adds a subtree at its place, and revert gives back the level exactly', () => {
        const built = buildChangesTestLevel();
        const { level, square } = built;
        const before = snapshotOf(level);
        const change = new AddEntitiesChange({
            reader,
            entities: groupWithNewIds(built),
            place: { parentId: square.id, index: 0 },
        });

        change.apply(level);
        const added = level.requireEntity(100);
        expect(added.parent).toBe(square);
        expect(added.children.map((entity) => entity.id)).toEqual([101]);
        expect(added.requireComponent(NameComponent).get('name')).toBe('Group 1');

        change.revert(level);
        expect(snapshotOf(level)).toEqual(before);
    });

    test('clones the data, so changing the caller objects afterwards changes nothing', () => {
        const built = buildChangesTestLevel();
        const entities = groupWithNewIds(built);
        const change = new AddEntitiesChange({ reader, entities, place: { parentId: built.level.world.id, index: 0 } });

        entities.splice(0, 2);
        change.apply(built.level);

        expect(built.level.world.children[0]?.id).toBe(100);
        expect(built.level.findEntity(101)).toBeDefined();
    });

    test('throws on data the reader refuses, leaving the level as before', () => {
        const built = buildChangesTestLevel();
        const before = snapshotOf(built.level);
        const [squareData] = new LevelWriter().writeSubtree([built.square]);
        if (squareData === undefined) throw new Error('The square was not written.');
        const change = new AddEntitiesChange({
            reader,
            entities: [squareData],
            place: { parentId: built.level.world.id, index: 0 },
        });

        const apply = () => change.apply(built.level);

        expect(apply).toThrow('could not be put into');
        expect(snapshotOf(built.level)).toEqual(before);
    });
});
