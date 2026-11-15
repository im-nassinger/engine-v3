import { describe, expect, test } from 'vitest';

import { BodyComponent, JointComponent, NameComponent, TransformComponent } from '../../../core/components/index.ts';
import { buildCommandTestSession, expectRoundTrip } from '../testing/commandTestSession.ts';
import { ManualTimer } from '../../time/testing/index.ts';
import { levelMatrixOf, matrixDifference } from '../testing/levelMatrices.ts';

function buildSession() {
    const timer = new ManualTimer();

    return buildCommandTestSession(timer.clock, timer);
}

describe('Ungroup', () => {
    test('puts the children in the group’s place, kept in place on screen and selected', () => {
        const { session, requireCommand, level, group, child, rope } = buildSession();
        const childBefore = levelMatrixOf(session, child);
        const groupIndex = level.world.children.indexOf(group);
        session.openLevel.selection.replace([group.id]);

        const outcome = requireCommand('arrange.ungroup').run();

        expect(outcome).toEqual({ kind: 'done', selectAfter: [child.id] });
        expect(level.findEntity(group.id)).toBeUndefined();
        expect(level.world.children[groupIndex]).toBe(child);
        expect(level.findEntity(rope.id)).toBe(rope);
        expect(matrixDifference(levelMatrixOf(session, child), childBefore)).toBeLessThan(1e-9);
        expect(session.openLevel.selection.ids).toEqual([child.id]);
        expect(session.openLevel.history.undoLabel).toBe('Ungroup Group 1');
    });

    test('names the components removed with the group, and the joints attached to it', () => {
        const { session, requireCommand, level, group } = buildSession();
        group.addComponent(new BodyComponent());
        const hinge = level.createEntity(level.world, 0);
        hinge.addComponent(new TransformComponent());
        hinge.addComponent(new NameComponent({ name: 'Hinge' }));
        hinge.addComponent(new JointComponent({ ...JointComponent.schema.defaults(), a: group.id }));
        session.openLevel.selection.replace([group.id]);

        const outcome = requireCommand('arrange.ungroup').run();

        expect(outcome).toMatchObject({ text: 'Removed with the group: BodyComponent, Hinge' });
        expect(level.findEntity(hinge.id)).toBeUndefined();
    });

    test('passes the run, undo, redo round trip', () => {
        const { session, requireCommand, level, group, square } = buildSession();
        group.addComponent(new BodyComponent());
        const second = level.createEntity(square, 0);
        second.addComponent(new TransformComponent());
        second.addComponent(new NameComponent({ name: 'Inside square' }));
        session.openLevel.selection.replace([group.id, square.id]);

        const trip = expectRoundTrip(session, () => requireCommand('arrange.ungroup').run());

        expect(trip.after).not.toEqual(trip.before);
        expect(trip.afterUndo).toEqual(trip.before);
        expect(trip.afterRedo).toEqual(trip.after);
        expect(session.openLevel.history.undoLabel).toBe('Ungroup 2 entities');
    });

    test('keeps a selected entity without children selected, and is disabled when none has children', () => {
        const { session, requireCommand, group, child, square } = buildSession();
        const ungroup = requireCommand('arrange.ungroup');

        session.openLevel.selection.replace([square.id]);
        expect(ungroup.availability()).toEqual({ enabled: false, reason: 'Nothing to ungroup' });
        expect(ungroup.run()).toEqual({ kind: 'refused', reason: 'Nothing to ungroup' });

        session.openLevel.selection.replace([group.id, square.id]);
        ungroup.run();
        expect(session.openLevel.selection.ids).toEqual([child.id, square.id]);
    });

    test('skips the World and the camera', () => {
        const { session, requireCommand, level } = buildSession();
        const lens = level.createEntity(level.camera, 0);
        lens.addComponent(new TransformComponent());
        lens.addComponent(new NameComponent({ name: 'Lens' }));

        session.openLevel.selection.replace([level.camera.id]);
        expect(requireCommand('arrange.ungroup').availability()).toEqual({
            enabled: false,
            reason: 'Nothing to ungroup',
        });

        session.openLevel.selection.replace([level.world.id]);
        expect(requireCommand('arrange.ungroup').availability()).toMatchObject({ enabled: false });
    });
});

describe('Go into group', () => {
    test('enters the selected group and clears the selection, with no step', () => {
        const { session, requireCommand, group } = buildSession();
        session.openLevel.selection.replace([group.id]);

        const outcome = requireCommand('arrange.goIntoGroup').run();

        expect(outcome).toEqual({ kind: 'done' });
        expect(session.openLevel.currentGroup.group).toBe(group);
        expect(session.openLevel.selection.isEmpty).toBe(true);
        expect(session.openLevel.history.undoCount).toBe(0);
    });

    test('works on the camera when it has children', () => {
        const { session, requireCommand, level } = buildSession();
        const lens = level.createEntity(level.camera, 0);
        lens.addComponent(new TransformComponent());
        session.openLevel.selection.replace([level.camera.id]);

        requireCommand('arrange.goIntoGroup').run();

        expect(session.openLevel.currentGroup.group).toBe(level.camera);
    });

    test('is disabled without exactly one selected entity that has children', () => {
        const { session, requireCommand, level, group, square } = buildSession();
        const goInto = requireCommand('arrange.goIntoGroup');
        const disabled = { enabled: false, reason: 'Select one group to go into' };

        expect(goInto.availability()).toEqual(disabled);

        session.openLevel.selection.replace([square.id]);
        expect(goInto.availability()).toEqual(disabled);

        session.openLevel.selection.replace([group.id, square.id]);
        expect(goInto.availability()).toEqual(disabled);

        session.openLevel.selection.replace([level.world.id]);
        expect(goInto.run()).toEqual({ kind: 'refused', reason: 'Select one group to go into' });
    });
});
