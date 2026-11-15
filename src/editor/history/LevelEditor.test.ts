import { describe, expect, test } from 'vitest';

import { createV1Registry } from '../../core/components/index.ts';
import type { EntityId } from '../../core/level/index.ts';
import { FormatUpgrader, LevelReader, V1_LEVEL_LIMITS } from '../../core/level-data/index.ts';
import { Selection } from '../selection/index.ts';
import { ManualClock } from '../time/testing/index.ts';

import { buildChangesTestLevel, snapshotOf } from './changes/changesTestLevel.ts';
import { RemoveEntitiesChange, SetSwitchChange } from './changes/index.ts';
import { History } from './History.ts';
import type { EditedGroup } from './LevelEditor.ts';
import { LevelEditor } from './LevelEditor.ts';

const reader = new LevelReader(createV1Registry(), V1_LEVEL_LIMITS, FormatUpgrader.createV1());

// The real CurrentGroup lives in editor/session, which builds on editor/history, so tests here use a
// stand-in that only remembers the path.
class RememberedGroup implements EditedGroup {
    path: readonly EntityId[];

    constructor(path: readonly EntityId[]) {
        this.path = path;
    }

    restore(path: readonly EntityId[]) {
        this.path = path;
    }
}

function buildEditor() {
    const parts = buildChangesTestLevel();
    const { level } = parts;
    const history = new History(new ManualClock());
    const selection = new Selection(level);
    const currentGroup = new RememberedGroup([level.world.id]);
    const editor = new LevelEditor({ level, history, selection, currentGroup });

    return { ...parts, history, selection, currentGroup, editor };
}

describe('LevelEditor', () => {
    test('a done command with changes records one step and selects what it says', () => {
        const { editor, history, selection, square, group } = buildEditor();

        const outcome = editor.edit('Hide Square', (transaction) => {
            transaction.apply(new SetSwitchChange(square.id, 'hidden', false, true));
            return { kind: 'done', selectAfter: [group.id] };
        });

        expect(outcome.kind).toBe('done');
        expect(square.isHidden).toBe(true);
        expect(history.undoLabel).toBe('Hide Square');
        expect(selection.ids).toEqual([group.id]);
    });

    test('a command that changes nothing makes no step', () => {
        const { editor, history } = buildEditor();

        const outcome = editor.edit('Nothing', () => ({ kind: 'done' }));

        expect(outcome.kind).toBe('done');
        expect(history.undoCount).toBe(0);
    });

    test('a refused command leaves the level, the selection and the group as before, with no step', () => {
        const { editor, history, level, selection, currentGroup, square, group } = buildEditor();
        selection.replace([square.id]);
        const before = snapshotOf(level);

        const outcome = editor.edit('Delete Square', (transaction) => {
            transaction.apply(RemoveEntitiesChange.ofEntity(reader, square));
            currentGroup.restore([level.world.id, group.id]);
            return { kind: 'refused', reason: 'The camera can’t be deleted' };
        });

        expect(outcome).toEqual({ kind: 'refused', reason: 'The camera can’t be deleted' });
        expect(snapshotOf(level)).toEqual(before);
        expect(selection.ids).toEqual([square.id]);
        expect(currentGroup.path).toEqual([level.world.id]);
        expect(history.undoCount).toBe(0);
    });

    test('a throwing command leaves the level as before and the error still surfaces', () => {
        const { editor, history, level, selection, square } = buildEditor();
        selection.replace([square.id]);
        const before = snapshotOf(level);

        const run = () =>
            editor.edit('Delete Square', (transaction) => {
                transaction.apply(RemoveEntitiesChange.ofEntity(reader, square));
                throw new Error('a bug');
            });

        expect(run).toThrow('a bug');
        expect(snapshotOf(level)).toEqual(before);
        expect(selection.ids).toEqual([square.id]);
        expect(history.undoCount).toBe(0);
    });

    test('undo restores the selection and the current group from before, redo those from after', () => {
        const { editor, level, selection, currentGroup, square, group, child } = buildEditor();
        currentGroup.restore([level.world.id, group.id]);
        selection.replace([child.id]);
        const before = snapshotOf(level);

        editor.edit('Delete Square', (transaction) => {
            transaction.apply(RemoveEntitiesChange.ofEntity(reader, square));
            currentGroup.restore([level.world.id]);
            return { kind: 'done', selectAfter: [group.id] };
        });

        selection.clear();
        currentGroup.restore([level.world.id, group.id, child.id]);
        const undone = editor.undo();

        expect(undone?.label).toBe('Delete Square');
        expect(snapshotOf(level)).toEqual(before);
        expect(selection.ids).toEqual([child.id]);
        expect(currentGroup.path).toEqual([level.world.id, group.id]);

        editor.redo();
        expect(level.findEntity(square.id)).toBeUndefined();
        expect(selection.ids).toEqual([group.id]);
        expect(currentGroup.path).toEqual([level.world.id]);
    });

    test('undo of a delete selects the entities that come back', () => {
        const { editor, selection, square } = buildEditor();
        selection.replace([square.id]);

        editor.edit('Delete Square', (transaction) => {
            transaction.apply(RemoveEntitiesChange.ofEntity(reader, square));
            return { kind: 'done' };
        });
        expect(selection.ids).toEqual([]);

        editor.undo();
        expect(selection.ids).toEqual([square.id]);
    });

    test('recordApplied records changes already in place, joining by key', () => {
        const { editor, history, square } = buildEditor();
        editor.recordApplied('Nothing', []);
        expect(history.undoCount).toBe(0);

        square.setHidden(true);
        editor.recordApplied('Hide Square', [new SetSwitchChange(square.id, 'hidden', false, true)], 'k');
        square.setHidden(false);
        editor.recordApplied('Show Square', [new SetSwitchChange(square.id, 'hidden', true, false)], 'k');

        expect(history.undoCount).toBe(1);
        expect(history.undoLabel).toBe('Show Square');
        editor.undo();
        expect(square.isHidden).toBe(false);
    });

    test('with nothing to undo or redo, both return undefined', () => {
        const { editor } = buildEditor();

        expect(editor.undo()).toBeUndefined();
        expect(editor.redo()).toBeUndefined();
    });
});
