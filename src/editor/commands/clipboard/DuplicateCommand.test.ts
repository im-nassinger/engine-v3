import { describe, expect, test } from 'vitest';

import { JointComponent, NameComponent, TransformComponent, createV1Registry } from '../../../core/components/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { FormatUpgrader, LevelReader, LevelWriter, V1_LEVEL_LIMITS } from '../../../core/level-data/index.ts';
import { EditorSession } from '../../session/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { createCommandRegistry } from '../createCommandRegistry.ts';
import { buildCommandTestSession, expectRoundTrip, levelSnapshot } from '../testing/commandTestSession.ts';

// The command test level: rope, square and the group holding the child, top row first.
function buildSession() {
    const timer = new ManualTimer();
    const built = buildCommandTestSession(timer.clock, timer, new ManualFrames());
    const duplicate = built.requireCommand('edit.duplicate');

    return { ...built, duplicate };
}

function select(session: EditorSession, entities: readonly Entity[]) {
    session.openLevel.selection.replace(entities.map((entity) => entity.id));
}

function selectedEntities(session: EditorSession) {
    return session.openLevel.selection.entities;
}

// An entity's data without its id, nested children included: what a copy must share with its original.
function dataWithoutIds(entity: Entity) {
    const [data] = new LevelWriter().writeSubtree([entity]);
    const text = JSON.stringify(data).replaceAll(/"id":\d+/g, '"id":0');

    return JSON.parse(text) as unknown;
}

describe('Duplicate', () => {
    test('puts each copy directly above its own original, in two groups, with no offset', () => {
        const { session, level, square, group, child, rope, duplicate } = buildSession();
        select(session, [square, child]);

        const outcome = duplicate.run();

        expect(outcome).toEqual({ kind: 'done', skipped: [] });
        const [squareCopy, childCopy] = selectedEntities(session);
        expect(level.world.children.filter((entity) => entity !== level.camera)).toEqual([
            rope,
            squareCopy,
            square,
            group,
        ]);
        expect(group.children).toEqual([childCopy, child]);
        expect(dataWithoutIds(squareCopy as Entity)).toEqual(dataWithoutIds(square));
        expect(dataWithoutIds(childCopy as Entity)).toEqual(dataWithoutIds(child));
        expect(session.openLevel.history.undoLabel).toBe('Duplicate 2 entities');
    });

    test('names a single entity in its step', () => {
        const { session, square, duplicate } = buildSession();
        select(session, [square]);

        duplicate.run();

        expect(session.openLevel.history.undoLabel).toBe('Duplicate Square');
        expect(selectedEntities(session)[0]?.requireComponent(NameComponent).get('name')).toBe('Square');
    });

    test('brings everything inside a duplicated group', () => {
        const { session, level, group, child, duplicate } = buildSession();
        select(session, [group, child]);

        duplicate.run();

        const [groupCopy] = selectedEntities(session);
        expect(selectedEntities(session)).toHaveLength(1);
        expect(groupCopy?.children).toHaveLength(1);
        expect(groupCopy?.children[0]).not.toBe(child);
        expect(level.world.children.indexOf(groupCopy as Entity)).toBe(level.world.children.indexOf(group) - 1);
    });

    test('joins a duplicated joint to the copies of its duplicated bodies', () => {
        const { session, rope, square, child, duplicate } = buildSession();
        select(session, [rope, square, child]);

        duplicate.run();

        const [ropeCopy, squareCopy, childCopy] = selectedEntities(session);
        const joint = ropeCopy?.requireComponent(JointComponent);
        expect(joint?.get('a')).toBe(childCopy?.id);
        expect(joint?.get('b')).toBe(squareCopy?.id);
    });

    test('keeps the bodies of a joint duplicated alone', () => {
        const { session, rope, square, child, duplicate } = buildSession();
        select(session, [rope]);

        duplicate.run();

        const joint = selectedEntities(session)[0]?.requireComponent(JointComponent);
        expect(joint?.get('a')).toBe(child.id);
        expect(joint?.get('b')).toBe(square.id);
    });

    test('passes the run, undo, redo round trip, and undo removes the copies', () => {
        const { session, square, child, duplicate } = buildSession();
        select(session, [square, child]);

        const trip = expectRoundTrip(session, () => duplicate.run());

        expect(trip.afterUndo).toEqual(trip.before);
        expect(trip.afterRedo).toEqual(trip.after);
        expect(trip.after).not.toEqual(trip.before);
    });

    test('redo brings back the same ids and selects them', () => {
        const { session, square, duplicate } = buildSession();
        select(session, [square]);
        duplicate.run();
        const copyIds = session.openLevel.selection.ids;

        session.openLevel.editor.undo();
        expect(session.openLevel.selection.ids).toEqual([square.id]);
        session.openLevel.editor.redo();

        expect(session.openLevel.selection.ids).toEqual(copyIds);
    });

    test('skips the camera, and says so', () => {
        const { session, level, square, duplicate } = buildSession();
        select(session, [square, level.camera]);

        const outcome = duplicate.run();

        expect(outcome).toEqual({ kind: 'done', skipped: [{ id: level.camera.id, kind: 'camera' }] });
        expect(selectedEntities(session)).toHaveLength(1);
    });

    test('gives the World and the camera alone their own texts, and nothing selected its own', () => {
        const { session, level, duplicate } = buildSession();

        select(session, [level.world]);
        expect(duplicate.availability()).toEqual({ enabled: false, reason: "The World can't be duplicated" });
        expect(duplicate.run()).toEqual({ kind: 'refused', reason: "The World can't be duplicated" });

        select(session, [level.camera]);
        expect(duplicate.run()).toEqual({ kind: 'refused', reason: "The camera can't be duplicated" });

        select(session, []);
        expect(duplicate.run()).toEqual({ kind: 'refused', reason: 'Nothing selected' });
    });

    test('inside a locked group is refused whole and changes nothing', () => {
        const { session, level, square, group, child, duplicate } = buildSession();
        group.setLocked(true);
        select(session, [square, child]);
        const before = levelSnapshot(level);

        const outcome = duplicate.run();

        expect(outcome).toEqual({ kind: 'refused', reason: 'This group is locked' });
        expect(levelSnapshot(level)).toEqual(before);
        expect(session.openLevel.history.undoCount).toBe(0);
    });

    test('over the entity limit is refused whole, naming it, and changes nothing', () => {
        const level = Level.createNew();
        const crates = ['Crate', 'Box'].map((name) => {
            const crate = level.createEntity(level.world, 0);
            crate.addComponent(new TransformComponent());
            crate.addComponent(new NameComponent({ name }));
            return crate;
        });
        const maxEntities = level.entityCount + 1;
        const timer = new ManualTimer();
        const registry = createV1Registry();
        const reader = new LevelReader(registry, { ...V1_LEVEL_LIMITS, maxEntities }, FormatUpgrader.createV1());
        const session = new EditorSession({
            level,
            clock: timer.clock,
            timer,
            frames: new ManualFrames(),
            registry,
            reader,
        });
        const duplicate = createCommandRegistry(session).find('edit.duplicate');
        select(session, crates);
        const before = levelSnapshot(level);

        const outcome = duplicate?.run();

        expect(outcome).toEqual({ kind: 'refused', reason: `A level holds at most ${maxEntities} entities` });
        expect(levelSnapshot(level)).toEqual(before);
        expect(session.openLevel.history.undoCount).toBe(0);
        expect(session.openLevel.selection.ids).toEqual(crates.map((crate) => crate.id));
    });

    test('is in the Edit menu after Paste with Ctrl+D, working while typing', () => {
        const { duplicate } = buildSession();

        expect(duplicate.menu).toEqual({ menu: 'Edit', section: 2, order: 40 });
        expect(duplicate.shortcuts).toEqual(['Ctrl+D']);
        expect(duplicate.shortcutScope).toBe('everywhere');
    });
});
