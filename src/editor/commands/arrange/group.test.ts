import { describe, expect, test } from 'vitest';

import { NameComponent, ShapeComponent, TransformComponent } from '../../../core/components/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { buildCommandTestSession, expectRoundTrip } from '../testing/commandTestSession.ts';
import { labelName } from '../../../core/level/index.ts';
import { ManualTimer } from '../../time/testing/index.ts';
import { levelMatrixOf, matrixDifference } from '../testing/levelMatrices.ts';

function addBox(level: Level, x: number, y: number) {
    const box = level.createEntity(level.world, 0);
    box.addComponent(new TransformComponent({ position: { x, y }, rotation: 0, scale: { x: 1, y: 1 }, skew: 0 }));
    box.addComponent(new NameComponent({ name: 'Box' }));
    box.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width: 10, height: 20 } }));

    return box;
}

function buildSession() {
    const timer = new ManualTimer();

    return buildCommandTestSession(timer.clock, timer);
}

describe('Group', () => {
    test('puts one run of rows into a new group at the frontmost row, named, selected, order kept', () => {
        const { session, requireCommand, level, square, rope } = buildSession();
        session.openLevel.selection.replace([square.id, rope.id]);

        const outcome = requireCommand('arrange.group').run();

        const newGroup = level.world.children[0];
        if (newGroup === undefined) throw new Error('No group.');
        expect(outcome).toEqual({ kind: 'done', selectAfter: [newGroup.id], skipped: [] });
        expect(labelName(newGroup)).toBe('Group 2');
        expect(newGroup.children).toEqual([rope, square]);
        expect(session.openLevel.selection.ids).toEqual([newGroup.id]);
        expect(session.openLevel.history.undoLabel).toBe('Group 2 entities');
    });

    test('puts the group’s origin at the centre of what its members draw, with no rotation, scale or skew', () => {
        const { session, requireCommand, level } = buildSession();
        const left = addBox(level, 0, 0);
        const right = addBox(level, 100, 40);
        session.openLevel.selection.replace([left.id, right.id]);

        requireCommand('arrange.group').run();

        const newGroup = left.parent;
        if (newGroup === undefined) throw new Error('No group.');
        const transform = newGroup.requireComponent(TransformComponent);
        expect(transform.get('position')).toEqual({ x: 50, y: 20 });
        expect(transform.get('rotation')).toBe(0);
        expect(transform.get('scale')).toEqual({ x: 1, y: 1 });
        expect(transform.get('skew')).toBe(0);
        expect(left.requireComponent(TransformComponent).get('position')).toEqual({ x: -50, y: -20 });
    });

    test('keeps every member in place on screen, skew included, and says the draw order changed', () => {
        const { session, requireCommand, child, square } = buildSession();
        const childBefore = levelMatrixOf(session, child);
        const squareBefore = levelMatrixOf(session, square);
        session.openLevel.selection.replace([child.id, square.id]);

        const outcome = requireCommand('arrange.group').run();

        expect(outcome).toMatchObject({ kind: 'done', text: 'Draw order changed' });
        expect(child.parent).toBe(square.parent);
        expect(matrixDifference(levelMatrixOf(session, child), childBefore)).toBeLessThan(1e-9);
        expect(matrixDifference(levelMatrixOf(session, square), squareBefore)).toBeLessThan(1e-9);
    });

    test('says the draw order changed for rows of one group with a gap between them', () => {
        const { session, requireCommand, group, rope } = buildSession();
        session.openLevel.selection.replace([rope.id, group.id]);

        const outcome = requireCommand('arrange.group').run();

        expect(outcome).toMatchObject({ text: 'Draw order changed' });
    });

    test('passes the run, undo, redo round trip', () => {
        const { session, requireCommand, child, square } = buildSession();
        session.openLevel.selection.replace([child.id, square.id]);

        const trip = expectRoundTrip(session, () => requireCommand('arrange.group').run());

        expect(trip.after).not.toEqual(trip.before);
        expect(trip.afterUndo).toEqual(trip.before);
        expect(trip.afterRedo).toEqual(trip.after);
        expect(session.openLevel.selection.ids).toHaveLength(1);
    });

    test('skips the camera and says so', () => {
        const { session, requireCommand, level, square } = buildSession();
        session.openLevel.selection.replace([square.id, level.camera.id]);

        const outcome = requireCommand('arrange.group').run();

        expect(outcome).toMatchObject({ skipped: [{ id: level.camera.id, kind: 'camera' }] });
        expect(level.camera.parent).toBe(level.world);
        expect(square.parent?.parent).toBe(level.world);
    });

    test('is disabled with only the World, only the camera or nothing selected', () => {
        const { session, requireCommand, level } = buildSession();
        const group = requireCommand('arrange.group');

        expect(group.availability()).toEqual({ enabled: false, reason: 'Nothing selected' });

        session.openLevel.selection.replace([level.camera.id]);
        expect(group.availability()).toEqual({ enabled: false, reason: "The camera can't be grouped" });

        session.openLevel.selection.replace([level.world.id]);
        expect(group.run()).toEqual({ kind: 'refused', reason: "The World can't be grouped" });
    });

    test('refuses going past 256 deep and leaves the level as it was', () => {
        const { session, requireCommand, level } = buildSession();
        const chain: Entity[] = [];
        let parent = level.world;
        for (let depth = 1; depth <= Level.maxDepth; depth += 1) {
            const link = level.createEntity(parent, 0);
            link.addComponent(new TransformComponent());
            link.addComponent(new NameComponent({ name: `Link ${depth}` }));
            chain.push(link);
            parent = link;
        }
        const deepest = chain[Level.maxDepth - 1];
        const secondDeepest = chain[Level.maxDepth - 2];
        if (deepest === undefined || secondDeepest === undefined) throw new Error('No chain.');
        const entityCountBefore = level.entityCount;

        session.openLevel.selection.replace([deepest.id]);
        const refused = requireCommand('arrange.group').run();

        expect(refused).toEqual({ kind: 'refused', reason: 'Groups can be at most 256 deep' });
        expect(level.entityCount).toBe(entityCountBefore);
        expect(session.openLevel.history.undoCount).toBe(0);

        session.openLevel.selection.replace([secondDeepest.id]);
        expect(requireCommand('arrange.group').run()).toEqual({
            kind: 'refused',
            reason: 'Groups can be at most 256 deep',
        });

        level.removeEntity(deepest);
        session.openLevel.selection.replace([secondDeepest.id]);
        expect(requireCommand('arrange.group').run()).toMatchObject({ kind: 'done' });
        expect(secondDeepest.depth).toBe(Level.maxDepth);
    });
});
