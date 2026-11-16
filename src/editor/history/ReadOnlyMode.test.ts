import { describe, expect, test } from 'vitest';

import { NameComponent, TransformComponent } from '../../core/components/index.ts';
import { Level } from '../../core/level/index.ts';
import { ManualTimer } from '../time/testing/index.ts';

import { SetSwitchChange } from './changes/index.ts';
import { History } from './History.ts';
import { LevelEditor } from './LevelEditor.ts';
import { LiveEdit } from './LiveEdit.ts';
import { READ_ONLY_REASON, ReadOnlyMode } from './ReadOnlyMode.ts';

function buildEditor() {
    const level = Level.createNew();
    const square = level.createEntity(level.world, 0);
    square.addComponent(new TransformComponent());
    square.addComponent(new NameComponent({ name: 'Square' }));

    let selectedIds: readonly number[] = [];
    const selection = {
        get ids() {
            return selectedIds;
        },
        replace: (ids: readonly number[]) => {
            selectedIds = ids;
        },
    };
    const currentGroup = { path: [], restore: () => {} };
    const readOnly = new ReadOnlyMode();
    const history = new History(new ManualTimer().clock);
    const editor = new LevelEditor({ level, history, selection, currentGroup, readOnly });
    const liveEdit = new LiveEdit(level, editor);
    const position = { entityId: square.id, schema: TransformComponent.schema, key: 'position' };

    const hideSquare = () =>
        editor.edit('Hide Square', (transaction) => {
            transaction.apply(new SetSwitchChange(square.id, 'hidden', false, true));
            return { kind: 'done', selectAfter: [square.id] };
        });

    return { level, square, readOnly, history, editor, liveEdit, position, hideSquare, selection };
}

describe('ReadOnlyMode', () => {
    test('starts off and moves its counter once when turned on', () => {
        const mode = new ReadOnlyMode();

        expect(mode.isOn).toBe(false);

        mode.turnOn();
        mode.turnOn();

        expect(mode.isOn).toBe(true);
        expect(mode.changed.version).toBe(1);
    });
});

describe('a read-only level', () => {
    test('refuses every edit with the reason, without running it or changing the selection', () => {
        const { square, readOnly, history, editor, hideSquare, selection } = buildEditor();
        readOnly.turnOn();
        let hasRun = false;

        const outcome = editor.edit('Anything', () => {
            hasRun = true;
            return { kind: 'done' };
        });

        expect(outcome).toEqual({ kind: 'refused', reason: READ_ONLY_REASON });
        expect(hideSquare()).toEqual({ kind: 'refused', reason: READ_ONLY_REASON });
        expect(hasRun).toBe(false);
        expect(square.isHidden).toBe(false);
        expect(selection.ids).toEqual([]);
        expect(history.undoCount).toBe(0);
        expect(editor.isReadOnly).toBe(true);
    });

    test('neither undoes nor redoes the steps made before it turned read-only', () => {
        const { square, readOnly, editor, hideSquare } = buildEditor();
        hideSquare();
        readOnly.turnOn();

        expect(editor.undo()).toBeUndefined();
        expect(square.isHidden).toBe(true);
        expect(editor.redo()).toBeUndefined();
    });

    test('begins no live edit, so a drag changes nothing', () => {
        const { readOnly, liveEdit, position } = buildEditor();
        readOnly.turnOn();
        let drags = 0;
        liveEdit.activeChanged.subscribe(() => (drags += 1));

        expect(liveEdit.begin([position])).toBe(false);
        expect(liveEdit.isActive).toBe(false);
        expect(drags).toBe(0);
    });

    test('a level editor built without a mode can always edit', () => {
        const { editor, liveEdit, position } = buildEditor();

        expect(editor.isReadOnly).toBe(false);
        expect(liveEdit.begin([position])).toBe(true);
    });
});
