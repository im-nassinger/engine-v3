import { describe, expect, test } from 'vitest';

import { BodyComponent, NameComponent, SurfaceComponent, TransformComponent } from '../../../core/components/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { buildCommandTestSession, expectRoundTrip } from '../testing/commandTestSession.ts';
import { levelMatrixOf, matrixDifference } from '../testing/levelMatrices.ts';

import { moveEntities } from './moveEntities.ts';

function buildSession() {
    const timer = new ManualTimer();

    return buildCommandTestSession(timer.clock, timer, new ManualFrames());
}

function addNamed(level: Level, parent: Entity, name: string) {
    const entity = level.createEntity(parent, parent.children.length);
    entity.addComponent(new TransformComponent());
    entity.addComponent(new NameComponent({ name }));

    return entity;
}

// A car turned and moved, and a crate with a lid, both in the World.
function addCarAndCrate(level: Level) {
    const car = addNamed(level, level.world, 'Car');
    car.requireComponent(TransformComponent).set('position', { x: 200, y: 100 });
    car.requireComponent(TransformComponent).set('rotation', 30);
    car.addComponent(new BodyComponent());
    const crate = addNamed(level, level.world, 'Crate');
    crate.addComponent(new BodyComponent());
    const lid = addNamed(level, crate, 'Lid');
    lid.requireComponent(TransformComponent).set('position', { x: 4, y: -8 });
    lid.addComponent(new SurfaceComponent());

    return { car, crate, lid };
}

describe('moveEntities', () => {
    test('moves an entity into a group, kept in place on screen with its skew, in one step', () => {
        const { session, level, group, child, square } = buildSession();
        const squareBefore = levelMatrixOf(session, square);

        const outcome = moveEntities(session.openLevel, [square.id], { parentId: group.id, index: 1 });

        expect(outcome).toEqual({ kind: 'done', selectAfter: [square.id] });
        expect(group.children).toEqual([child, square]);
        expect(level.world.children).not.toContain(square);
        expect(matrixDifference(levelMatrixOf(session, square), squareBefore)).toBeLessThan(1e-9);
        expect(session.openLevel.history.undoCount).toBe(1);
        expect(session.openLevel.history.undoLabel).toBe('Move Square');
    });

    test('moves a skewed child out of its group, kept in place on screen', () => {
        const { session, level, child } = buildSession();
        const childBefore = levelMatrixOf(session, child);

        moveEntities(session.openLevel, [child.id], { parentId: level.world.id, index: 0 });

        expect(level.world.children[0]).toBe(child);
        expect(matrixDifference(levelMatrixOf(session, child), childBefore)).toBeLessThan(1e-9);
    });

    test('passes the run, undo, redo round trip', () => {
        const { session, group, child, rope } = buildSession();

        const trip = expectRoundTrip(session, () =>
            moveEntities(session.openLevel, [child.id, rope.id], { parentId: group.id, index: 0 }),
        );

        expect(trip.after).not.toEqual(trip.before);
        expect(trip.afterUndo).toEqual(trip.before);
        expect(trip.afterRedo).toEqual(trip.after);
    });

    test('lands them side by side in their panel order, whatever order they were given in', () => {
        const { session, level } = buildSession();
        const holder = addNamed(level, level.world, 'Holder');
        const [a, b, c, d, e] = ['A', 'B', 'C', 'D', 'E'].map((name) => addNamed(level, holder, name));
        if (a === undefined || c === undefined || e === undefined) throw new Error('No entities.');

        const outcome = moveEntities(session.openLevel, [c.id, a.id], { parentId: holder.id, index: 5 });

        expect(outcome).toMatchObject({ kind: 'done' });
        expect(holder.children).toEqual([b, d, e, a, c]);
        expect(session.openLevel.history.undoLabel).toBe('Move 2 entities');

        session.openLevel.editor.undo();
        expect(holder.children).toEqual([a, b, c, d, e]);
    });

    test('counts the target index among the children before the move, the dragged ones included', () => {
        const { session, level } = buildSession();
        const holder = addNamed(level, level.world, 'Holder');
        const [a, b, c, d, e] = ['A', 'B', 'C', 'D', 'E'].map((name) => addNamed(level, holder, name));
        if (a === undefined || d === undefined) throw new Error('No entities.');

        moveEntities(session.openLevel, [a.id, d.id], { parentId: holder.id, index: 3 });

        expect(holder.children).toEqual([b, c, a, d, e]);
    });

    test('moves an entity inside another dragged one with it, not on its own', () => {
        const { session, level, group, child } = buildSession();
        const holder = addNamed(level, level.world, 'Holder');

        const outcome = moveEntities(session.openLevel, [child.id, group.id], { parentId: holder.id, index: 0 });

        expect(outcome).toEqual({ kind: 'done', selectAfter: [group.id] });
        expect(holder.children).toEqual([group]);
        expect(child.parent).toBe(group);
    });

    test('makes no step when dropped where they already are', () => {
        const { session, level, square, group } = buildSession();

        const above = moveEntities(session.openLevel, [square.id], { parentId: level.world.id, index: 1 });
        const below = moveEntities(session.openLevel, [square.id], { parentId: level.world.id, index: 2 });
        const both = moveEntities(session.openLevel, [square.id, group.id], { parentId: level.world.id, index: 3 });

        expect([above, below, both]).toEqual([{ kind: 'done' }, { kind: 'done' }, { kind: 'done' }]);
        expect(session.openLevel.history.undoCount).toBe(0);
    });

    test('refuses a move past 256 deep and leaves the level as it was', () => {
        const { session, level, square } = buildSession();
        const tall = addNamed(level, level.world, 'Tall');
        addNamed(level, tall, 'Inside');
        let deepest = level.world;
        for (let depth = 1; depth < Level.maxDepth; depth += 1) {
            deepest = addNamed(level, deepest, `Link ${depth}`);
        }

        const refused = moveEntities(session.openLevel, [tall.id], { parentId: deepest.id, index: 0 });
        const fits = moveEntities(session.openLevel, [square.id], { parentId: deepest.id, index: 0 });

        expect(refused).toEqual({ kind: 'refused', reason: 'Groups can be at most 256 deep' });
        expect(tall.parent).toBe(level.world);
        expect(fits).toMatchObject({ kind: 'done' });
        expect(square.depth).toBe(Level.maxDepth);
        expect(session.openLevel.history.undoCount).toBe(1);
    });

    test('refuses the World, the camera outside the World, and an entity into itself', () => {
        const { session, level, group, child } = buildSession();
        const openLevel = session.openLevel;

        expect(moveEntities(openLevel, [level.world.id], { parentId: group.id, index: 0 })).toEqual({
            kind: 'refused',
            reason: "The World can't be moved",
        });
        expect(moveEntities(openLevel, [level.camera.id], { parentId: group.id, index: 0 })).toEqual({
            kind: 'refused',
            reason: 'The camera stays directly in the World',
        });
        expect(moveEntities(openLevel, [group.id], { parentId: child.id, index: 0 })).toEqual({
            kind: 'refused',
            reason: "An entity can't go inside itself",
        });
        expect(openLevel.history.undoCount).toBe(0);
    });

    test('moves the camera within the World', () => {
        const { session, level } = buildSession();

        moveEntities(session.openLevel, [level.camera.id], { parentId: level.world.id, index: 0 });

        expect(level.world.children[0]).toBe(level.camera);
    });

    test("asks first when a crate's child goes into a car, and changes nothing until OK", () => {
        const { session, level } = buildSession();
        const { car, crate, lid } = addCarAndCrate(level);

        const outcome = moveEntities(session.openLevel, [lid.id], { parentId: car.id, index: 0 });

        expect(outcome).toMatchObject({
            kind: 'needsConfirmation',
            question: {
                title: 'Move into another body?',
                text: '1 entity will move with a different body in play.',
                confirmLabel: 'Move',
            },
        });
        expect(lid.parent).toBe(crate);
        expect(session.openLevel.history.undoCount).toBe(0);
    });

    test('OK moves it in one step, kept in place on screen, and undo puts it back without asking', () => {
        const { session, level } = buildSession();
        const { car, crate, lid } = addCarAndCrate(level);
        const lidBefore = levelMatrixOf(session, lid);

        const outcome = moveEntities(session.openLevel, [lid.id], { parentId: car.id, index: 0 });
        if (outcome.kind !== 'needsConfirmation') throw new Error('No question.');

        expect(outcome.confirm()).toEqual({ kind: 'done', selectAfter: [lid.id] });
        expect(lid.parent).toBe(car);
        expect(matrixDifference(levelMatrixOf(session, lid), lidBefore)).toBeLessThan(1e-9);
        expect(session.openLevel.history.undoCount).toBe(1);
        expect(session.openLevel.history.undoLabel).toBe('Move Lid');

        session.openLevel.editor.undo();
        expect(lid.parent).toBe(crate);
    });

    test('counts what moves inside a dragged body', () => {
        const { session, level } = buildSession();
        const { car, crate } = addCarAndCrate(level);

        const outcome = moveEntities(session.openLevel, [crate.id], { parentId: car.id, index: 0 });

        expect(outcome).toMatchObject({
            kind: 'needsConfirmation',
            question: { text: '2 entities will move with a different body in play.' },
        });
    });

    test('a move that keeps the body asks nothing', () => {
        const { session, level } = buildSession();
        const { crate, lid } = addCarAndCrate(level);
        const box = addNamed(level, crate, 'Box');

        const outcome = moveEntities(session.openLevel, [lid.id], { parentId: box.id, index: 0 });

        expect(outcome).toEqual({ kind: 'done', selectAfter: [lid.id] });
        expect(lid.parent).toBe(box);
    });
});
