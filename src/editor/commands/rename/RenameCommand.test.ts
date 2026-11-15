import { describe, expect, test } from 'vitest';

import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { buildCommandTestSession } from '../testing/commandTestSession.ts';

function buildSession() {
    const timer = new ManualTimer();
    const built = buildCommandTestSession(timer.clock, timer, new ManualFrames());
    const rename = built.requireCommand('edit.rename');

    return { ...built, rename };
}

describe('Rename', () => {
    test('is F2 in the Edit menu', () => {
        const { rename } = buildSession();

        expect(rename.shortcuts).toEqual(['F2']);
        expect(rename.menu?.menu).toBe('Edit');
    });

    test('is disabled with nothing selected, saying why', () => {
        const { session, rename } = buildSession();

        expect(rename.availability()).toEqual({ enabled: false, reason: 'Select one entity to rename' });
        expect(rename.run()).toEqual({ kind: 'refused', reason: 'Select one entity to rename' });
        expect(session.openLevel.renameRequest.entityId).toBeUndefined();
    });

    test('is disabled with several selected, saying why', () => {
        const { session, rename, square, rope } = buildSession();
        session.openLevel.selection.replace([square.id, rope.id]);

        expect(rename.availability()).toEqual({ enabled: false, reason: 'Select one entity to rename' });
        expect(rename.run()).toEqual({ kind: 'refused', reason: 'Select one entity to rename' });
    });

    test('is disabled with the World selected, saying why', () => {
        const { session, rename, level } = buildSession();
        session.openLevel.selection.replace([level.world.id]);

        expect(rename.availability()).toEqual({ enabled: false, reason: "The World can't be renamed" });
        expect(rename.run()).toEqual({ kind: 'refused', reason: "The World can't be renamed" });
        expect(session.openLevel.renameRequest.entityId).toBeUndefined();
    });

    test('asks the panel to rename the selected entity, making no step', () => {
        const { session, rename, square } = buildSession();
        session.openLevel.selection.replace([square.id]);

        expect(rename.availability()).toEqual({ enabled: true });
        expect(rename.run()).toEqual({ kind: 'done' });
        expect(session.openLevel.renameRequest.entityId).toBe(square.id);
        expect(session.openLevel.history.undoCount).toBe(0);
    });

    test('reveals a row inside a folded group', () => {
        const { session, rename, group, child } = buildSession();
        const { entitiesRows, selection } = session.openLevel;
        // Selecting reveals the row itself, so the group is folded after.
        selection.replace([child.id]);
        entitiesRows.setFolded(group.id, true);
        expect(entitiesRows.indexOf(child.id)).toBe(-1);

        rename.run();

        expect(entitiesRows.indexOf(child.id)).toBeGreaterThan(-1);
        expect(session.openLevel.renameRequest.entityId).toBe(child.id);
    });
});
