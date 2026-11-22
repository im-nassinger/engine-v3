import { describe, expect, test } from 'vitest';

import { BodyComponent, InputComponent, ShapeComponent, SurfaceComponent } from '../../../core/components/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { buildCommandTestSession } from '../testing/commandTestSession.ts';

import { applyMessageFix } from './applyMessageFix.ts';
import { removeComponent } from './removeComponent.ts';

function buildCrates() {
    const timer = new ManualTimer();
    const frames = new ManualFrames();
    const built = buildCommandTestSession(timer.clock, timer, frames);

    for (const crate of [built.square, built.child]) {
        crate.addComponent(new ShapeComponent());
        crate.addComponent(new BodyComponent());
        crate.addComponent(new SurfaceComponent());
    }

    return { ...built, frames };
}

function surfaceNotes(session: ReturnType<typeof buildCrates>['session']) {
    const card = session.openLevel.entityInspector.cards.find((candidate) => candidate.typeName === 'SurfaceComponent');

    return card?.notes ?? [];
}

describe('applyMessageFix', () => {
    test("a removed ShapeComponent's note on the SurfaceComponent card is fixed in one step", () => {
        const { session, square, frames } = buildCrates();
        const openLevel = session.openLevel;
        openLevel.selection.replace([square.id]);

        removeComponent(openLevel, [square.id], 'ShapeComponent');
        frames.runFrame();

        const [note] = surfaceNotes(session);
        expect(note?.text).toBe('Needs a Shape to collide.');
        expect(note?.fix?.label).toBe('Add Shape');
        if (note?.fix === undefined) throw new Error('The note has no fix.');

        const stepsBefore = openLevel.history.undoCount;
        expect(applyMessageFix(openLevel, note.fix, note.entityIds)).toEqual({ kind: 'done' });
        frames.runFrame();

        expect(square.hasComponent(ShapeComponent)).toBe(true);
        expect(openLevel.history.undoCount).toBe(stepsBefore + 1);
        expect(surfaceNotes(session)).toEqual([]);
        expect(openLevel.messages.all()).toEqual([]);
    });

    test('a note on several entities fixes all of them, and undo brings the note back', () => {
        const { session, square, child, frames } = buildCrates();
        const openLevel = session.openLevel;
        const ids = [square.id, child.id];
        openLevel.selection.replace(ids);
        removeComponent(openLevel, ids, 'ShapeComponent');
        frames.runFrame();

        const [note] = surfaceNotes(session);
        if (note?.fix === undefined) throw new Error('The note has no fix.');
        applyMessageFix(openLevel, note.fix, note.entityIds);
        frames.runFrame();

        expect(child.hasComponent(ShapeComponent)).toBe(true);
        expect(square.hasComponent(ShapeComponent)).toBe(true);

        openLevel.editor.undo();
        frames.runFrame();

        expect(surfaceNotes(session)[0]?.entityIds).toEqual(ids);
    });

    test('the World\'s "No inputs" note adds the five inputs in one step', () => {
        const { session, frames } = buildCrates();
        const openLevel = session.openLevel;
        const world = openLevel.level.world;
        openLevel.selection.replace([world.id]);
        removeComponent(openLevel, [world.id], 'InputComponent');
        frames.runFrame();

        const worldCard = openLevel.entityInspector.cards.find((card) => card.typeName === 'PhysicsWorldComponent');
        const [note] = worldCard?.notes ?? [];
        expect(note?.text).toBe('No inputs.');
        if (note?.fix === undefined) throw new Error('The note has no fix.');

        const stepsBefore = openLevel.history.undoCount;
        applyMessageFix(openLevel, note.fix, note.entityIds);
        frames.runFrame();

        expect(
            world
                .getComponent(InputComponent)
                ?.get('inputs')
                .map((input) => input.name),
        ).toEqual(['left', 'right', 'up', 'down', 'jump']);
        expect(openLevel.history.undoCount).toBe(stepsBefore + 1);
        expect(openLevel.messages.all()).toEqual([]);
    });
});
