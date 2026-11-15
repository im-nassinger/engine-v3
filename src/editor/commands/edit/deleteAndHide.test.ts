import { describe, expect, test } from 'vitest';

import { JointComponent, NameComponent, TransformComponent } from '../../../core/components/index.ts';
import { ManualTimer } from '../../time/testing/index.ts';
import { buildCommandTestSession, expectRoundTrip } from '../testing/commandTestSession.ts';

function buildSession() {
    const timer = new ManualTimer();

    return buildCommandTestSession(timer.clock, timer);
}

describe('Delete', () => {
    test('removes a group with its child and the joint attached to the child', () => {
        const { session, requireCommand, level, group, child, square, rope } = buildSession();
        session.openLevel.selection.replace([group.id]);

        const outcome = requireCommand('edit.delete').run();

        expect(outcome).toEqual({ kind: 'done', selectAfter: [], skipped: [] });
        expect(level.findEntity(group.id)).toBeUndefined();
        expect(level.findEntity(child.id)).toBeUndefined();
        expect(level.findEntity(rope.id)).toBeUndefined();
        expect(level.findEntity(square.id)).toBe(square);
        expect(session.openLevel.history.undoLabel).toBe('Delete Group 1');
    });

    test('passes the run, undo, redo round trip, putting the joint back in its place', () => {
        const { session, requireCommand, group, square } = buildSession();
        session.openLevel.selection.replace([group.id, square.id]);

        const trip = expectRoundTrip(session, () => requireCommand('edit.delete').run());

        expect(trip.afterUndo).toEqual(trip.before);
        expect(trip.afterRedo).toEqual(trip.after);
        expect(session.openLevel.history.undoLabel).toBe('Delete 2 entities');
    });

    test('puts back the selection on undo', () => {
        const { session, requireCommand, square } = buildSession();
        session.openLevel.selection.replace([square.id]);

        requireCommand('edit.delete').run();
        expect(session.openLevel.selection.ids).toEqual([]);

        session.openLevel.editor.undo();
        expect(session.openLevel.selection.ids).toEqual([square.id]);
    });

    test('deleting a joint deletes only the joint', () => {
        const { session, requireCommand, level, child, square, rope } = buildSession();
        session.openLevel.selection.replace([rope.id]);

        requireCommand('edit.delete').run();

        expect(level.findEntity(rope.id)).toBeUndefined();
        expect(level.findEntity(child.id)).toBe(child);
        expect(level.findEntity(square.id)).toBe(square);
    });

    test('also removes a joint attached to something inside a removed joint', () => {
        const { session, requireCommand, level, square, rope } = buildSession();
        const ropeChild = level.createEntity(rope, 0);
        ropeChild.addComponent(new TransformComponent());
        ropeChild.addComponent(new NameComponent({ name: 'Rope child' }));
        const secondRope = level.createEntity(level.world, 0);
        secondRope.addComponent(new TransformComponent());
        secondRope.addComponent(new NameComponent({ name: 'Second rope' }));
        secondRope.addComponent(new JointComponent({ ...JointComponent.schema.defaults(), a: ropeChild.id }));
        session.openLevel.selection.replace([square.id]);

        const trip = expectRoundTrip(session, () => requireCommand('edit.delete').run());

        expect(trip.afterUndo).toEqual(trip.before);
        expect(level.findEntity(rope.id)).toBeUndefined();
        expect(level.findEntity(secondRope.id)).toBeUndefined();
    });

    test('with the camera says Camera kept', () => {
        const { session, requireCommand, level, square } = buildSession();
        session.openLevel.selection.replace([square.id, level.camera.id]);

        const outcome = requireCommand('edit.delete').run();

        expect(outcome).toEqual({
            kind: 'done',
            selectAfter: [],
            skipped: [{ id: level.camera.id, kind: 'camera' }],
        });
        expect(level.findEntity(level.camera.id)).toBe(level.camera);
        expect(level.findEntity(square.id)).toBeUndefined();
    });

    test('is disabled with only the camera, the World or nothing selected', () => {
        const { session, requireCommand, level } = buildSession();
        const deleteCommand = requireCommand('edit.delete');

        expect(deleteCommand.availability()).toEqual({ enabled: false, reason: 'Nothing selected' });

        session.openLevel.selection.replace([level.camera.id]);
        expect(deleteCommand.availability()).toEqual({ enabled: false, reason: "The camera can't be deleted" });
        expect(deleteCommand.run()).toEqual({ kind: 'refused', reason: "The camera can't be deleted" });

        session.openLevel.selection.replace([level.world.id]);
        expect(deleteCommand.availability()).toEqual({ enabled: false, reason: "The World can't be deleted" });
        expect(session.openLevel.history.undoCount).toBe(0);
    });
});

describe('Hide or show', () => {
    test('hides every selected entity when any is shown, and shows them all otherwise', () => {
        const { session, requireCommand, group, square } = buildSession();
        const hideOrShow = requireCommand('edit.hideOrShow');
        square.setHidden(true);
        session.openLevel.selection.replace([group.id, square.id]);

        hideOrShow.run();
        expect(group.isHidden).toBe(true);
        expect(square.isHidden).toBe(true);
        expect(session.openLevel.history.undoLabel).toBe('Hide 2 entities');

        hideOrShow.run();
        expect(group.isHidden).toBe(false);
        expect(square.isHidden).toBe(false);
        expect(session.openLevel.history.undoLabel).toBe('Show 2 entities');
    });

    test('changes only the entity’s own switch, leaving its children’s', () => {
        const { session, requireCommand, group, child } = buildSession();
        child.setHidden(true);
        session.openLevel.selection.replace([group.id]);

        requireCommand('edit.hideOrShow').run();
        requireCommand('edit.hideOrShow').run();

        expect(group.isHidden).toBe(false);
        expect(child.isHidden).toBe(true);
    });

    test('passes the run, undo, redo round trip', () => {
        const { session, requireCommand, group, square } = buildSession();
        square.setHidden(true);
        session.openLevel.selection.replace([group.id, square.id]);

        const trip = expectRoundTrip(session, () => requireCommand('edit.hideOrShow').run());

        expect(trip.after).not.toEqual(trip.before);
        expect(trip.afterUndo).toEqual(trip.before);
        expect(trip.afterRedo).toEqual(trip.after);
        expect(square.isHidden).toBe(true);
    });

    test('can hide the camera, but not the World', () => {
        const { session, requireCommand, level } = buildSession();
        const hideOrShow = requireCommand('edit.hideOrShow');

        session.openLevel.selection.replace([level.camera.id]);
        expect(hideOrShow.run()).toEqual({ kind: 'done', skipped: [] });
        expect(level.camera.isHidden).toBe(true);
        expect(session.openLevel.history.undoLabel).toBe('Hide Camera');

        session.openLevel.selection.replace([level.world.id]);
        expect(hideOrShow.availability()).toEqual({ enabled: false, reason: "The World can't be hidden" });
        expect(hideOrShow.run()).toEqual({ kind: 'refused', reason: "The World can't be hidden" });
        expect(level.world.isHidden).toBe(false);
    });

    test('is disabled with nothing selected', () => {
        const { requireCommand } = buildSession();

        expect(requireCommand('edit.hideOrShow').availability()).toEqual({
            enabled: false,
            reason: 'Nothing selected',
        });
    });
});
