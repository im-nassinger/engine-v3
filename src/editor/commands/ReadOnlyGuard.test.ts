import { describe, expect, test } from 'vitest';

import { TransformComponent } from '../../core/components/index.ts';
import { READ_ONLY_REASON } from '../history/index.ts';
import { ManualFrames, ManualTimer } from '../time/testing/index.ts';

import type { CopyCommand } from './clipboard/CopyCommand.ts';
import type { CutCommand } from './clipboard/CutCommand.ts';
import type { PasteCommand } from './clipboard/PasteCommand.ts';
import { createShape } from './draw/createShape.ts';
import { toggleEntityHidden } from './hide/toggleEntityHidden.ts';
import { setFieldValue } from './inspector/setFieldValue.ts';
import { renameEntity } from './rename/renameEntity.ts';
import { renameLevel } from './rename/renameLevel.ts';
import { buildCommandTestSession, levelSnapshot } from './testing/commandTestSession.ts';

const READ_ONLY = { enabled: false, reason: READ_ONLY_REASON };
const REFUSED = { kind: 'refused', reason: READ_ONLY_REASON };

// What a read-only tab may still do: look, select, go into a group, copy.
const LOOKING_IDS = new Set(['edit.copy', 'edit.selectAll', 'arrange.goIntoGroup', 'help.about']);

function isLooking(id: string) {
    return LOOKING_IDS.has(id) || id.startsWith('view.');
}

// The square selected, with one step to undo made before the tab turned read-only.
function buildReadOnly() {
    const timer = new ManualTimer();
    const built = buildCommandTestSession(timer.clock, timer, new ManualFrames());
    const { session, square } = built;
    session.openLevel.selection.replace([square.id]);
    toggleEntityHidden(session.openLevel, square.id);
    toggleEntityHidden(session.openLevel, square.id);
    session.makeReadOnly();

    return built;
}

describe('a read-only tab', () => {
    test('disables every command that edits, with the reason', () => {
        const { registry } = buildReadOnly();
        const editing = registry.all.filter((command) => !isLooking(command.id));

        expect(editing.map((command) => command.id)).toEqual(
            expect.arrayContaining(['edit.undo', 'edit.redo', 'edit.cut', 'edit.paste', 'edit.delete']),
        );
        for (const command of editing) {
            expect(command.availability(), command.id).toEqual(READ_ONLY);
        }
    });

    test('refuses every command that edits, and the level stays as it was', () => {
        const { registry, level, session } = buildReadOnly();
        const before = levelSnapshot(level);

        for (const command of registry.all.filter((each) => !isLooking(each.id))) {
            expect(command.run(), command.id).toEqual(REFUSED);
        }

        expect(levelSnapshot(level)).toEqual(before);
        expect(session.openLevel.history.undoCount).toBe(2);
    });

    test('refuses the edits that are not commands: the Inspector, renaming, the eye, drawing', () => {
        const { session, level, square } = buildReadOnly();
        const { openLevel } = session;
        const before = levelSnapshot(level);
        const drawing = { geometry: { kind: 'circle', radius: 10 }, position: { x: 0, y: 0 } } as const;

        const moved = setFieldValue(openLevel, [square.id], 'TransformComponent', 'position', { x: 9, y: 9 });

        expect(moved).toEqual(REFUSED);
        expect(renameEntity(openLevel, square.id, 'Crate')).toEqual(REFUSED);
        expect(renameLevel(openLevel, 'Mine')).toEqual(REFUSED);
        expect(toggleEntityHidden(openLevel, square.id)).toEqual(REFUSED);
        expect(createShape(openLevel, session.reader, drawing)).toEqual(REFUSED);
        expect(square.requireComponent(TransformComponent).get('position')).toEqual({ x: 0, y: 0 });
        expect(levelSnapshot(level)).toEqual(before);
    });

    test('Cut copies nothing, and a pasted text pastes nothing', () => {
        const { registry, level } = buildReadOnly();
        const cut = registry.find('edit.cut') as CutCommand;
        const copy = registry.find('edit.copy') as CopyCommand;
        const paste = registry.find('edit.paste') as PasteCommand;
        const before = levelSnapshot(level);

        expect(cut.cut()).toEqual({ outcome: REFUSED, text: undefined });

        const copied = copy.copy();
        if (copied.kind === 'refused') throw new Error(copied.reason);

        expect(paste.pasteText(copied.text)).toEqual(REFUSED);
        expect(levelSnapshot(level)).toEqual(before);
    });

    test('still selects, copies, goes into a group and changes the view', () => {
        const { registry, session, group } = buildReadOnly();
        const zoomBefore = session.view.zoom;

        expect(registry.find('edit.selectAll')?.run().kind).toBe('done');
        expect(session.openLevel.selection.ids.length).toBeGreaterThan(1);
        expect(registry.find('edit.copy')?.run().kind).toBe('done');

        session.openLevel.selection.replace([group.id]);
        expect(registry.find('arrange.goIntoGroup')?.run().kind).toBe('done');
        expect(session.openLevel.currentGroup.group).toBe(group);

        registry.find('view.zoomIn')?.run();
        registry.find('view.grid')?.run();
        expect(session.view.zoom).toBeGreaterThan(zoomBefore);
        expect(session.viewSettings.isOn('grid')).toBe(false);
    });

    test('stays read-only on a level opened after it', () => {
        const { session, registry, square } = buildReadOnly();

        session.replaceOpenLevel(session.openLevel.level);

        expect(session.openLevel.editor.isReadOnly).toBe(true);
        expect(toggleEntityHidden(session.openLevel, square.id)).toEqual(REFUSED);
        expect(registry.find('edit.delete')?.availability()).toEqual(READ_ONLY);
    });
});
