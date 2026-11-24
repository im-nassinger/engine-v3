import { describe, expect, test } from 'vitest';

import { NameComponent, ShapeComponent, TransformComponent, createV1Registry } from '../../../core/components/index.ts';
import { Matrix2D } from '../../../core/geometry/index.ts';
import type { Bounds } from '../../../core/geometry/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { FormatUpgrader, LevelReader, LevelWriter, V1_LEVEL_LIMITS } from '../../../core/level-data/index.ts';
import type { LevelLimits } from '../../../core/level-data/index.ts';
import { ClipboardCodec, IdRemapping } from '../../clipboard/index.ts';
import type { EntityFragment } from '../../clipboard/index.ts';
import { EditorSession } from '../../session/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { buildCommandTestSession, levelSnapshot } from '../testing/commandTestSession.ts';
import { levelMatrixOf, matrixDifference } from '../testing/levelMatrices.ts';
import { pasteEntities } from './pasteEntities.ts';
import type { PasteSpot } from './pasteEntities.ts';
import { pasteRefusalText } from './pasteRefusalText.ts';

const codec = new ClipboardCodec(new LevelWriter());

function addCrate(level: Level, name: string, position: Point) {
    const crate = level.createEntity(level.world, 0);
    crate.addComponent(new TransformComponent({ ...TransformComponent.schema.defaults(), position }));
    crate.addComponent(new NameComponent({ name }));
    crate.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width: 40, height: 20 } }));

    return crate;
}

// The command test level with two crates on top: Crate at 300, 0 and Box at -200, 100.
function buildSession() {
    const timer = new ManualTimer();
    const built = buildCommandTestSession(timer.clock, timer, new ManualFrames());
    const crate = addCrate(built.level, 'Crate', { x: 300, y: 0 });
    const box = addCrate(built.level, 'Box', { x: -200, y: 100 });

    return { ...built, crate, box };
}

function limitedSession(limits: Partial<LevelLimits>) {
    const timer = new ManualTimer();
    const registry = createV1Registry();
    const reader = new LevelReader(registry, { ...V1_LEVEL_LIMITS, ...limits }, FormatUpgrader.createCurrent());
    const level = Level.createNew();

    return new EditorSession({ level, clock: timer.clock, timer, frames: new ManualFrames(), registry, reader });
}

function copy(session: EditorSession, entities: readonly Entity[]) {
    const text = codec.encode(entities, session.openLevel);
    const decoded = codec.decode(text);
    if (decoded.kind !== 'entities') throw new Error('The copy was not read back.');

    return decoded.fragment;
}

function paste(session: EditorSession, fragment: EntityFragment, spot: PasteSpot) {
    const tools = { reader: session.reader, writer: new LevelWriter(), remapping: new IdRemapping(session.registry) };

    return pasteEntities(session.openLevel, tools, fragment, spot);
}

// The selected copies' box, every copy drawing something.
function pastedBox(session: EditorSession) {
    const { level, selection, caches } = session.openLevel;
    let box: Bounds | undefined;

    for (const id of selection.ids) {
        const entityBox = caches.bounds.subtreeBoundsOf(level.requireEntity(id));
        if (entityBox === undefined) throw new Error('A pasted copy draws nothing.');

        box = box === undefined ? entityBox : box.union(entityBox);
    }

    if (box === undefined) throw new Error('Nothing was pasted.');

    return box;
}

describe('pasteEntities', () => {
    test('puts the copies on top of the World with new ids, selected, in one step', () => {
        const { session, level, crate, box } = buildSession();
        const fragment = copy(session, [crate, box]);

        const outcome = paste(session, fragment, { destination: { x: 0, y: 0 }, gridSize: undefined });

        expect(outcome.kind).toBe('done');
        const pastedIds = session.openLevel.selection.ids;
        expect(pastedIds).toHaveLength(2);
        expect(pastedIds).not.toContain(crate.id);
        expect(level.world.children.slice(0, 2).map((entity) => entity.id)).toEqual(pastedIds);
        expect(session.openLevel.history.undoLabel).toBe('Paste 2 entities');
    });

    test('one root names itself in the step', () => {
        const { session, crate } = buildSession();

        paste(session, copy(session, [crate]), { destination: { x: 0, y: 0 }, gridSize: undefined });

        expect(session.openLevel.history.undoLabel).toBe('Paste Crate');
    });

    test.each([1, 4])('lands centred on the mouse at a zoom of %d', (zoom) => {
        const { session, crate, box } = buildSession();
        session.view.setSize(800, 600);
        session.view.zoomAt({ x: 400, y: 300 }, zoom);
        const mouse = session.view.screenToLevel({ x: 100, y: 50 });

        paste(session, copy(session, [crate, box]), { destination: mouse, gridSize: undefined });

        const centre = pastedBox(session).centre;
        expect(centre.x).toBeCloseTo(mouse.x, 9);
        expect(centre.y).toBeCloseTo(mouse.y, 9);
    });

    test("with grid snapping on, the box's top left lands on the nearest grid point", () => {
        const { session, crate } = buildSession();

        // The crate's box with its outline is 42 by 22, so centred on 101, 57 its top left is at 80, 46.
        paste(session, copy(session, [crate]), { destination: { x: 101, y: 57 }, gridSize: 32 });

        const box = pastedBox(session);
        expect(box.left).toBeCloseTo(96, 9);
        expect(box.top).toBeCloseTo(32, 9);
    });

    test('under a rotated, skewed current group, a copy looks as the original does, moved to the mouse', () => {
        const { session, level, group, crate } = buildSession();
        const fragment = copy(session, [crate]);
        session.openLevel.currentGroup.enter(group);
        const destination = { x: 40, y: -70 };

        paste(session, fragment, { destination, gridSize: undefined });

        const pasted = level.requireEntity(session.openLevel.selection.ids[0] ?? 0);
        expect(pasted.parent).toBe(group);
        expect(group.children[0]).toBe(pasted);
        const move = new Matrix2D(
            1,
            0,
            0,
            1,
            destination.x - fragment.box.centre.x,
            destination.y - fragment.box.centre.y,
        );
        const expected = move.multiply(levelMatrixOf(session, crate));
        expect(matrixDifference(levelMatrixOf(session, pasted), expected)).toBeLessThan(1e-9);
    });

    test('undo removes the paste and redo brings back the same ids', () => {
        const { session, level, crate, box } = buildSession();
        const before = levelSnapshot(level);
        paste(session, copy(session, [crate, box]), { destination: { x: 0, y: 0 }, gridSize: undefined });
        const pastedIds = session.openLevel.selection.ids;
        const after = levelSnapshot(level);

        session.openLevel.editor.undo();
        expect(levelSnapshot(level)).toEqual(before);

        session.openLevel.editor.redo();
        expect(levelSnapshot(level)).toEqual(after);
        expect(session.openLevel.selection.ids).toEqual(pastedIds);
    });

    test('inside a locked group is refused and changes nothing', () => {
        const { session, level, group, crate } = buildSession();
        const fragment = copy(session, [crate]);
        group.setLocked(true);
        session.openLevel.currentGroup.enter(group);
        const before = levelSnapshot(level);

        const outcome = paste(session, fragment, { destination: { x: 0, y: 0 }, gridSize: undefined });

        expect(outcome).toEqual({ kind: 'refused', reason: 'This group is locked' });
        expect(levelSnapshot(level)).toEqual(before);
        expect(session.openLevel.history.undoCount).toBe(0);
    });

    test('damaged entities are refused whole and change nothing', () => {
        const { session, level, crate } = buildSession();
        const fragment = copy(session, [crate]);
        const damaged = { ...fragment, entities: [...fragment.entities, { id: 'one' }] };
        const before = levelSnapshot(level);

        const outcome = paste(session, damaged, { destination: { x: 0, y: 0 }, gridSize: undefined });

        expect(outcome).toEqual({ kind: 'refused', reason: "The pasted entities can't be read: they are damaged" });
        expect(levelSnapshot(level)).toEqual(before);
    });
});

describe('pasteEntities over a limit', () => {
    function expectRefused(target: EditorSession, fragment: EntityFragment, reason: string) {
        const before = levelSnapshot(target.openLevel.level);

        const outcome = paste(target, fragment, { destination: { x: 0, y: 0 }, gridSize: undefined });

        expect(outcome).toEqual({ kind: 'refused', reason });
        expect(levelSnapshot(target.openLevel.level)).toEqual(before);
        expect(target.openLevel.history.undoCount).toBe(0);
    }

    test('too many entities', () => {
        const { session, crate, box } = buildSession();
        const target = limitedSession({ maxEntities: Level.createNew().entityCount + 1 });

        expectRefused(
            target,
            copy(session, [crate, box]),
            `A level holds at most ${Level.createNew().entityCount + 1} entities`,
        );
    });

    test('too deep', () => {
        const { session, group } = buildSession();
        const target = limitedSession({ maxDepth: 1 });

        // The group is 1 deep and its child 2.
        expectRefused(target, copy(session, [group]), 'Groups can be at most 1 deep');
    });

    test('too many points', () => {
        const { session, level } = buildSession();
        const polygon = level.createEntity(level.world, 0);
        polygon.addComponent(new TransformComponent());
        const points = [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
            { x: 0, y: 10 },
        ];
        polygon.addComponent(new ShapeComponent({ geometry: { kind: 'polygon', points } }));
        const target = limitedSession({ maxShapePoints: 3 });

        expectRefused(target, copy(session, [polygon]), 'A shape or path holds at most 3 points');
    });
});

describe('pasteRefusalText', () => {
    test("names v1's limits as the editor writes them", () => {
        const texts = [
            pasteRefusalText({ reason: 'overLimit', limit: 'entities', max: 100_000 }),
            pasteRefusalText({ reason: 'overLimit', limit: 'depth', max: 256 }),
            pasteRefusalText({ reason: 'overLimit', limit: 'points', max: 1_000 }),
        ];

        expect(texts).toEqual([
            'A level holds at most 100,000 entities',
            'Groups can be at most 256 deep',
            'A shape or path holds at most 1,000 points',
        ]);
    });

    test('says when the entities come from a newer game', () => {
        const text = pasteRefusalText({ reason: 'newerVersion', fileVersion: 2 });

        expect(text).toBe("The pasted entities can't be read: they come from a newer version of the game");
    });
});
