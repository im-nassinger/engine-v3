import { describe, expect, test } from 'vitest';

import { NameComponent, TransformComponent } from '../../core/components/index.ts';
import { Level } from '../../core/level/index.ts';
import { SetSwitchChange } from '../history/index.ts';
import { ManualTimer } from '../time/testing/index.ts';

import { EditorSession } from './EditorSession.ts';

function buildSession() {
    const timer = new ManualTimer();
    const level = Level.createNew();
    const square = level.createEntity(level.world, 0);
    square.addComponent(new TransformComponent());
    square.addComponent(new NameComponent({ name: 'Square' }));

    const session = new EditorSession({ level, clock: timer.clock, timer });

    return { session, level, square };
}

describe('EditorSession', () => {
    test('opens the level given, in the World, with nothing selected and no history', () => {
        const { session, level } = buildSession();
        const openLevel = session.openLevel;

        expect(openLevel.level).toBe(level);
        expect(openLevel.currentGroup.group).toBe(level.world);
        expect(openLevel.selection.isEmpty).toBe(true);
        expect(openLevel.history.undoCount).toBe(0);
    });

    test('an edit through the open level is one step that undo reverts', () => {
        const { session, square } = buildSession();
        const { editor, history } = session.openLevel;

        editor.edit('Hide Square', (transaction) => {
            transaction.apply(new SetSwitchChange(square.id, 'hidden', false, true));
            return { kind: 'done' };
        });
        editor.undo();

        expect(square.isHidden).toBe(false);
        expect(history.redoLabel).toBe('Hide Square');
    });

    test('replacing the open level starts a fresh history, selection and current group', () => {
        const { session, square } = buildSession();
        const oldOpenLevel = session.openLevel;
        oldOpenLevel.selection.replace([square.id]);
        oldOpenLevel.editor.edit('Hide Square', (transaction) => {
            transaction.apply(new SetSwitchChange(square.id, 'hidden', false, true));
            return { kind: 'done' };
        });
        const versionBefore = session.openLevelChanged.version;

        const newLevel = Level.createNew();
        session.replaceOpenLevel(newLevel);

        const openLevel = session.openLevel;
        expect(openLevel).not.toBe(oldOpenLevel);
        expect(openLevel.level).toBe(newLevel);
        expect(openLevel.history.undoCount).toBe(0);
        expect(openLevel.selection.isEmpty).toBe(true);
        expect(openLevel.currentGroup.group).toBe(newLevel.world);
        expect(openLevel.entitiesRows.rows[0]?.entityId).toBe(newLevel.world.id);
        expect(session.openLevelChanged.version).toBe(versionBefore + 1);
    });

    test('the replaced open level stops following its level', () => {
        const { session, level, square } = buildSession();
        const oldOpenLevel = session.openLevel;
        oldOpenLevel.selection.replace([square.id]);

        session.replaceOpenLevel(Level.createNew());
        level.removeEntity(square);

        expect(oldOpenLevel.selection.ids).toEqual([square.id]);
    });
});
