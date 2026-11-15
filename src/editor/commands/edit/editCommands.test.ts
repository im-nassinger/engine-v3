import { describe, expect, test } from 'vitest';

import { NameComponent, TransformComponent } from '../../../core/components/index.ts';
import { Level } from '../../../core/level/index.ts';
import { SetSwitchChange } from '../../history/index.ts';
import { EditorSession } from '../../session/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { createCommandRegistry } from '../createCommandRegistry.ts';

function buildSession() {
    const timer = new ManualTimer();
    const level = Level.createNew();

    const group = level.createEntity(level.world, 0);
    group.addComponent(new TransformComponent());
    group.addComponent(new NameComponent({ name: 'Group 1' }));
    const child = level.createEntity(group, 0);
    child.addComponent(new TransformComponent());

    const square = level.createEntity(level.world, 0);
    square.addComponent(new TransformComponent());
    square.addComponent(new NameComponent({ name: 'Square' }));

    const session = new EditorSession({ level, clock: timer.clock, timer, frames: new ManualFrames() });
    const registry = createCommandRegistry(session);

    return { session, registry, level, group, child, square };
}

function requireCommand(registry: ReturnType<typeof createCommandRegistry>, id: string) {
    const command = registry.find(id);
    if (command === undefined) throw new Error(`No command ${id}.`);

    return command;
}

function hideSquare(session: EditorSession, squareId: number) {
    session.openLevel.editor.edit('Hide Square', (transaction) => {
        transaction.apply(new SetSwitchChange(squareId, 'hidden', false, true));
        return { kind: 'done', selectAfter: [squareId] };
    });
}

describe('Undo and Redo', () => {
    test('are disabled with nothing to undo or redo, saying so', () => {
        const { registry } = buildSession();
        const undo = requireCommand(registry, 'edit.undo');
        const redo = requireCommand(registry, 'edit.redo');

        expect(undo.availability()).toEqual({ enabled: false, reason: 'Nothing to undo' });
        expect(redo.availability()).toEqual({ enabled: false, reason: 'Nothing to redo' });
        expect(undo.run()).toEqual({ kind: 'refused', reason: 'Nothing to undo' });
        expect(redo.run()).toEqual({ kind: 'refused', reason: 'Nothing to redo' });
    });

    test('say what they did', () => {
        const { session, registry, square } = buildSession();
        const undo = requireCommand(registry, 'edit.undo');
        const redo = requireCommand(registry, 'edit.redo');
        hideSquare(session, square.id);

        expect(undo.availability()).toEqual({ enabled: true });
        expect(undo.run()).toEqual({ kind: 'done', text: 'Undid: Hide Square' });
        expect(square.isHidden).toBe(false);

        expect(redo.availability()).toEqual({ enabled: true });
        expect(redo.run()).toEqual({ kind: 'done', text: 'Redid: Hide Square' });
        expect(square.isHidden).toBe(true);
    });

    test('put back the selection from before and after the step', () => {
        const { session, registry, square } = buildSession();
        hideSquare(session, square.id);
        const selection = session.openLevel.selection;

        requireCommand(registry, 'edit.undo').run();
        expect(selection.ids).toEqual([]);

        requireCommand(registry, 'edit.redo').run();
        expect(selection.ids).toEqual([square.id]);
    });

    test('are off while a drag holds the mouse, and the drag goes on', () => {
        const { session, registry, square } = buildSession();
        hideSquare(session, square.id);
        const undo = requireCommand(registry, 'edit.undo');
        const redo = requireCommand(registry, 'edit.redo');
        const { liveEdit } = session.openLevel;
        const position = { entityId: square.id, schema: TransformComponent.schema, key: 'position' };

        liveEdit.begin([position]);
        liveEdit.update(position, { x: 9, y: 9 });

        expect(undo.availability()).toEqual({ enabled: false, reason: 'Not during a drag' });
        expect(redo.availability()).toEqual({ enabled: false, reason: 'Not during a drag' });
        expect(undo.run()).toEqual({ kind: 'refused', reason: 'Not during a drag' });
        expect(square.isHidden).toBe(true);
        expect(liveEdit.isActive).toBe(true);

        liveEdit.commit('Move 1 entity');
        expect(undo.run()).toEqual({ kind: 'done', text: 'Undid: Move 1 entity' });
    });

    test('work on the open level after it is replaced', () => {
        const { session, registry, square } = buildSession();
        hideSquare(session, square.id);

        session.replaceOpenLevel(Level.createNew());

        expect(requireCommand(registry, 'edit.undo').availability().enabled).toBe(false);
    });
});

describe('Select all', () => {
    test('selects the current group’s direct children without the World and the camera', () => {
        const { session, registry, level, group, square } = buildSession();

        const outcome = requireCommand(registry, 'edit.selectAll').run();

        const selectedIds = [...session.openLevel.selection.ids].sort();
        const expectedIds = [group.id, square.id].sort();
        expect(outcome).toEqual({ kind: 'done' });
        expect(selectedIds).toEqual(expectedIds);
        expect(selectedIds).not.toContain(level.camera.id);
    });

    test('selects inside the group you are in', () => {
        const { session, registry, group, child } = buildSession();
        session.openLevel.currentGroup.enter(group);

        requireCommand(registry, 'edit.selectAll').run();

        expect(session.openLevel.selection.ids).toEqual([child.id]);
    });

    test('is not a step', () => {
        const { session, registry } = buildSession();

        requireCommand(registry, 'edit.selectAll').run();

        expect(session.openLevel.history.undoCount).toBe(0);
    });

    test('is disabled with nothing to select', () => {
        const timer = new ManualTimer();
        const session = new EditorSession({
            level: Level.createNew(),
            clock: timer.clock,
            timer,
            frames: new ManualFrames(),
        });
        const selectAll = requireCommand(createCommandRegistry(session), 'edit.selectAll');

        expect(selectAll.availability()).toEqual({ enabled: false, reason: 'Nothing to select' });
        expect(selectAll.run()).toEqual({ kind: 'refused', reason: 'Nothing to select' });
    });
});
