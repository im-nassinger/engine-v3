import { describe, expect, test } from 'vitest';

import { buildChangesTestLevel, snapshotOf } from './changesTestLevel.ts';
import { SetSwitchChange } from './SetSwitchChange.ts';

describe('SetSwitchChange', () => {
    test('hides and shows an entity, and revert gives back the level exactly', () => {
        const { level, square } = buildChangesTestLevel();
        const before = snapshotOf(level);
        const change = new SetSwitchChange(square.id, 'hidden', false, true);

        change.apply(level);
        expect(square.isHidden).toBe(true);
        expect(square.isLocked).toBe(false);

        change.revert(level);
        expect(snapshotOf(level)).toEqual(before);
    });

    test('locks and unlocks an entity', () => {
        const { level, group } = buildChangesTestLevel();
        const change = new SetSwitchChange(group.id, 'locked', false, true);

        change.apply(level);
        expect(group.isLocked).toBe(true);
        expect(group.isHidden).toBe(false);

        change.revert(level);
        expect(group.isLocked).toBe(false);
    });
});
