import { describe, expect, test } from 'vitest';

import { createV1Registry, NameComponent } from '../../../core/components/index.ts';
import type { EntityData } from '../../../core/level-data/index.ts';
import { FormatUpgrader, LevelReader, LevelWriter, V1_LEVEL_LIMITS } from '../../../core/level-data/index.ts';

import { AddEntitiesChange } from './AddEntitiesChange.ts';
import { buildChangesTestLevel, snapshotOf } from './changesTestLevel.ts';

const reader = new LevelReader(createV1Registry(), V1_LEVEL_LIMITS, FormatUpgrader.createV1());

// The group and its child as data under new ids, as paste will give them. The lists are the test's own,
// so a test can change them.
function groupWithNewIds(level: ReturnType<typeof buildChangesTestLevel>) {
    const [groupData] = new LevelWriter().writeSubtree([level.group]);
    const childData = groupData?.children[0];
    if (groupData === undefined || childData === undefined) throw new Error('The group was not written.');

    const children: EntityData[] = [{ ...childData, id: 101 }];
    const group = { ...groupData, id: 100, children };

    return { entities: [group], children };
}

describe('AddEntitiesChange', () => {
    test('adds a subtree at its place, and revert gives back the level exactly', () => {
        const built = buildChangesTestLevel();
        const { level, square } = built;
        const before = snapshotOf(level);
        const change = new AddEntitiesChange({
            reader,
            entities: groupWithNewIds(built).entities,
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
        const { entities, children } = groupWithNewIds(built);
        const change = new AddEntitiesChange({ reader, entities, place: { parentId: built.level.world.id, index: 0 } });

        children.splice(0, 1);
        entities.splice(0, 1);
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
