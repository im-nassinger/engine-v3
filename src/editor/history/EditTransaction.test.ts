import { describe, expect, test } from 'vitest';

import { buildChangesTestLevel, snapshotOf } from './changes/changesTestLevel.ts';
import { SetSwitchChange } from './changes/index.ts';
import { EditTransaction } from './EditTransaction.ts';

describe('EditTransaction', () => {
    test('applies each change as it is added', () => {
        const { level, square } = buildChangesTestLevel();
        const transaction = new EditTransaction(level);

        expect(transaction.isEmpty).toBe(true);
        transaction.apply(new SetSwitchChange(square.id, 'hidden', false, true));

        expect(square.isHidden).toBe(true);
        expect(transaction.isEmpty).toBe(false);
    });

    test('rollback reverts everything newest first and leaves the level as before', () => {
        const { level, square } = buildChangesTestLevel();
        const before = snapshotOf(level);
        const transaction = new EditTransaction(level);

        transaction.apply(new SetSwitchChange(square.id, 'hidden', false, true));
        transaction.apply(new SetSwitchChange(square.id, 'hidden', true, false));
        transaction.apply(new SetSwitchChange(square.id, 'hidden', false, true));
        transaction.rollback();

        expect(snapshotOf(level)).toEqual(before);
        expect(transaction.isEmpty).toBe(true);
    });

    test('takeChanges hands over the changes in order and empties the transaction', () => {
        const { level, square, group } = buildChangesTestLevel();
        const transaction = new EditTransaction(level);
        const first = new SetSwitchChange(square.id, 'hidden', false, true);
        const second = new SetSwitchChange(group.id, 'locked', false, true);

        transaction.apply(first);
        transaction.apply(second);

        expect(transaction.takeChanges()).toEqual([first, second]);
        expect(transaction.isEmpty).toBe(true);
        expect(square.isHidden).toBe(true);
    });
});
