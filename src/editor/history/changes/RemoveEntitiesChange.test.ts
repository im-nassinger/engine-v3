import { describe, expect, test } from 'vitest';

import { createV1Registry } from '../../../core/components/index.ts';
import { FormatUpgrader, LevelReader, V1_LEVEL_LIMITS } from '../../../core/level-data/index.ts';

import { buildChangesTestLevel, snapshotOf } from './changesTestLevel.ts';
import { RemoveEntitiesChange } from './RemoveEntitiesChange.ts';

const reader = new LevelReader(createV1Registry(), V1_LEVEL_LIMITS, FormatUpgrader.createV1());

describe('RemoveEntitiesChange', () => {
    test('removes a group with its skewed child, and revert gives back the same ids, values and order', () => {
        const { level, group, child } = buildChangesTestLevel();
        child.setHidden(true);
        group.setLocked(true);
        const before = snapshotOf(level);
        const change = RemoveEntitiesChange.ofEntity(reader, group);

        change.apply(level);
        expect(level.findEntity(group.id)).toBeUndefined();
        expect(level.findEntity(child.id)).toBeUndefined();

        change.revert(level);
        expect(snapshotOf(level)).toEqual(before);
    });

    test('applies and reverts again, as redo and a second undo do', () => {
        const { level, square } = buildChangesTestLevel();
        const before = snapshotOf(level);
        const change = RemoveEntitiesChange.ofEntity(reader, square);

        change.apply(level);
        const afterRemoving = snapshotOf(level);
        change.revert(level);
        change.apply(level);
        expect(snapshotOf(level)).toEqual(afterRemoving);

        change.revert(level);
        expect(snapshotOf(level)).toEqual(before);
    });

    test('throws when the removed entities can no longer go back', () => {
        const { level, square } = buildChangesTestLevel();
        const change = RemoveEntitiesChange.ofEntity(reader, square);
        change.apply(level);
        level.restoreEntity(square.id, level.world, 0);

        const revert = () => change.revert(level);

        expect(revert).toThrow(`The entities could not be put into ${level.world.id}`);
    });
});
