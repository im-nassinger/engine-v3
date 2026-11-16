import { describe, expect, test } from 'vitest';

import { ShapeComponent, StyleComponent, TransformComponent } from '../../../core/components/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { Level } from '../../../core/level/index.ts';
import { createCommandRegistry } from '../../commands/index.ts';
import { EditorSession } from '../../session/index.ts';
import { GridSnapper } from '../../snapping/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import type { LevelPointerInput, Modifiers } from '../Tool.ts';

import { SelectTool } from './SelectTool.ts';

// A filled 100 px square, its centre at the position.
function addSquare(level: Level, parent: Entity, position: Point) {
    const square = level.createEntity(parent, 0);
    const transform = new TransformComponent();
    transform.set('position', position);
    square.addComponent(transform);
    square.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width: 100, height: 100 } }));
    square.addComponent(new StyleComponent());

    return square;
}

// Two squares at 100, 100 and 300, 100, and a group at 600, 300, turned, stretched and skewed, holding
// one square at its origin. Snapping is the real grid's, 50 px, on. Screen and level are the same at zoom 1.
function buildMoveTest() {
    const level = Level.createNew();
    const square = addSquare(level, level.world, { x: 100, y: 100 });
    const other = addSquare(level, level.world, { x: 300, y: 100 });
    const group = level.createEntity(level.world, 0);
    const groupTransform = new TransformComponent();
    groupTransform.set('position', { x: 600, y: 300 });
    groupTransform.set('rotation', 30);
    groupTransform.set('scale', { x: 2, y: 0.5 });
    groupTransform.set('skew', 20);
    group.addComponent(groupTransform);
    const child = addSquare(level, group, { x: 0, y: 0 });

    const timer = new ManualTimer();
    const session = new EditorSession({ level, clock: timer.clock, timer, frames: new ManualFrames() });
    session.view.setSize(800, 600);
    const tool = new SelectTool();
    tool.activate({
        get openLevel() {
            return session.openLevel;
        },
        view: session.view,
        snapper: new GridSnapper(level.editorData, session.viewSettings),
        commands: createCommandRegistry(session),
        status: session.status,
        reader: session.reader,
        finished: () => {},
    });
    const { selection, history, liveEdit, caches } = session.openLevel;
    const levelOriginOf = (entity: Entity) => caches.worldMatrices.matrixOf(entity).apply({ x: 0, y: 0 });

    return { level, square, other, group, child, session, tool, selection, history, liveEdit, levelOriginOf };
}

type PointerOptions = Partial<Modifiers>;

function pointer(position: Point, options: PointerOptions = {}): LevelPointerInput {
    return {
        levelPosition: position,
        screenPosition: position,
        button: 'left',
        modifiers: { shift: options.shift ?? false, alt: options.alt ?? false, ctrl: options.ctrl ?? false },
        clickCount: 1,
    };
}

function positionOf(entity: Entity) {
    return entity.requireComponent(TransformComponent).get('position');
}

function drag(tool: SelectTool, from: Point, to: Point, options: PointerOptions = {}) {
    tool.pointerDown(pointer(from, options));
    tool.pointerMove(pointer({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }, options));
    tool.pointerMove(pointer(to, options));
    tool.pointerUp(pointer(to, options));
}

describe('SelectTool moving', () => {
    test('a drag on an unselected entity selects it and moves it, in one step that undo puts back', () => {
        const { square, tool, selection, history, session } = buildMoveTest();

        drag(tool, { x: 100, y: 100 }, { x: 133, y: 121 }, { ctrl: true });

        expect(selection.ids).toEqual([square.id]);
        expect(positionOf(square)).toEqual({ x: 133, y: 121 });
        expect(history.undoCount).toBe(1);
        expect(history.undoLabel).toBe('Move Entity');

        session.openLevel.editor.undo();
        expect(positionOf(square)).toEqual({ x: 100, y: 100 });
    });

    test('moves the whole selection live, and the release makes one step for many moves', () => {
        const { square, other, tool, selection, history, liveEdit } = buildMoveTest();
        selection.replace([square.id, other.id]);

        tool.pointerDown(pointer({ x: 100, y: 100 }, { ctrl: true }));
        for (let step = 1; step <= 60; step += 1) {
            tool.pointerMove(pointer({ x: 100 + step, y: 100 }, { ctrl: true }));
        }

        expect(liveEdit.isActive).toBe(true);
        expect(positionOf(other)).toEqual({ x: 360, y: 100 });
        expect(history.undoCount).toBe(0);

        tool.pointerUp(pointer({ x: 160, y: 100 }, { ctrl: true }));

        expect(liveEdit.isActive).toBe(false);
        expect(positionOf(square)).toEqual({ x: 160, y: 100 });
        expect(history.undoCount).toBe(1);
        expect(history.undoLabel).toBe('Move 2 entities');
    });

    test('a child in a turned, stretched, skewed group moves with the mouse on screen', () => {
        const { child, tool, selection, levelOriginOf } = buildMoveTest();
        selection.replace([child.id]);
        const before = levelOriginOf(child);

        drag(tool, before, { x: before.x + 37, y: before.y - 23 }, { ctrl: true });

        const after = levelOriginOf(child);
        expect(after.x - before.x).toBeCloseTo(37, 9);
        expect(after.y - before.y).toBeCloseTo(-23, 9);
    });

    test('Shift locks to the axis moved along most', () => {
        const { square, tool } = buildMoveTest();

        drag(tool, { x: 100, y: 100 }, { x: 130, y: 112 }, { ctrl: true, shift: false });
        tool.pointerDown(pointer({ x: 130, y: 112 }, { ctrl: true }));
        tool.pointerMove(pointer({ x: 135, y: 160 }, { ctrl: true, shift: true }));
        tool.pointerUp(pointer({ x: 135, y: 160 }, { ctrl: true, shift: true }));

        expect(positionOf(square)).toEqual({ x: 130, y: 160 });
    });

    test('the edges and centre snap to the grid, and Ctrl turns snapping off', () => {
        const { square, tool, session } = buildMoveTest();

        // The drawn box, its outline included, is 49 to 151 across. Moved 47 px, its left edge is 4 px from
        // the line at 100, its centre 3 px from 150 and its right edge 2 px from 200: the nearest wins.
        drag(tool, { x: 100, y: 100 }, { x: 147, y: 100 });
        expect(positionOf(square)).toEqual({ x: 149, y: 100 });

        session.openLevel.editor.undo();
        drag(tool, { x: 100, y: 100 }, { x: 147, y: 100 }, { ctrl: true });
        expect(positionOf(square)).toEqual({ x: 147, y: 100 });
    });

    test('Esc puts the selection back and makes no step', () => {
        const { square, tool, history, liveEdit } = buildMoveTest();

        tool.pointerDown(pointer({ x: 100, y: 100 }));
        tool.pointerMove(pointer({ x: 180, y: 140 }, { ctrl: true }));
        expect(tool.cancel()).toBe(true);
        tool.pointerUp(pointer({ x: 180, y: 140 }));

        expect(positionOf(square)).toEqual({ x: 100, y: 100 });
        expect(liveEdit.isActive).toBe(false);
        expect(history.undoCount).toBe(0);
    });

    test('a locked entity in the selection stays where it is', () => {
        const { square, other, tool, selection } = buildMoveTest();
        other.setLocked(true);
        selection.replace([square.id, other.id]);

        drag(tool, { x: 100, y: 100 }, { x: 120, y: 100 }, { ctrl: true });

        expect(positionOf(square)).toEqual({ x: 120, y: 100 });
        expect(positionOf(other)).toEqual({ x: 300, y: 100 });
    });

    test('a 2 px drag is still a click and moves nothing', () => {
        const { square, tool, history } = buildMoveTest();

        drag(tool, { x: 100, y: 100 }, { x: 102, y: 100 });

        expect(positionOf(square)).toEqual({ x: 100, y: 100 });
        expect(history.undoCount).toBe(0);
    });
});
