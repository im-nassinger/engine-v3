import { describe, expect, test } from 'vitest';

import { ShapeComponent, StyleComponent, TransformComponent } from '../../../core/components/index.ts';
import type { Point, ShapeGeometry } from '../../../core/geometry/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { Level } from '../../../core/level/index.ts';
import { createCommandRegistry } from '../../commands/index.ts';
import { EditorSession } from '../../session/index.ts';
import { GridSnapper } from '../../snapping/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import type { LevelPointerInput, Modifiers } from '../Tool.ts';

import type { FrameHandle } from './frame/FrameHandle.ts';
import { SelectTool } from './SelectTool.ts';

const RIGHT: FrameHandle = { x: 1, y: 0 };
const BOTTOM_RIGHT: FrameHandle = { x: 1, y: 1 };
const TOP_LEFT: FrameHandle = { x: -1, y: -1 };

function addShape(level: Level, parent: Entity, position: Point, geometry: ShapeGeometry) {
    const entity = level.createEntity(parent, 0);
    const transform = new TransformComponent();
    transform.set('position', position);
    entity.addComponent(transform);
    entity.addComponent(new ShapeComponent({ geometry }));
    entity.addComponent(new StyleComponent());

    return entity;
}

const SQUARE: ShapeGeometry = { kind: 'rectangle', width: 100, height: 100 };

// A 100 px square at 100, 100, a second one at 300, 100, and a group at 600, 300, turned, stretched and
// skewed, holding a square at its origin. Snapping is the real grid's, 50 px. Screen and level are the
// same at zoom 1.
function buildResizeTest() {
    const level = Level.createNew();
    const square = addShape(level, level.world, { x: 100, y: 100 }, SQUARE);
    const other = addShape(level, level.world, { x: 300, y: 100 }, SQUARE);
    const group = level.createEntity(level.world, 0);
    const groupTransform = new TransformComponent();
    groupTransform.set('position', { x: 600, y: 300 });
    groupTransform.set('rotation', 30);
    groupTransform.set('scale', { x: 2, y: 0.5 });
    groupTransform.set('skew', 20);
    group.addComponent(groupTransform);
    const child = addShape(level, group, { x: 0, y: 0 }, SQUARE);

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
        finished: () => {},
    });
    const { selection, history, liveEdit } = session.openLevel;

    return { level, square, other, group, child, session, tool, selection, history, liveEdit };
}

type PointerOptions = Partial<Modifiers>;

function pointer(position: Point, options: PointerOptions = {}): LevelPointerInput {
    return {
        levelPosition: position,
        screenPosition: position,
        button: 'left',
        modifiers: { shift: options.shift ?? false, alt: options.alt ?? false, ctrl: options.ctrl ?? true },
        clickCount: 1,
    };
}

// Snapping is off unless options.ctrl is false.
function dragHandle(tool: SelectTool, handle: FrameHandle, by: Point, options: PointerOptions = {}) {
    const frame = tool.frame;
    if (frame === undefined) throw new Error('No handles to drag.');

    const from = frame.handlePosition(handle);
    const to = { x: from.x + by.x, y: from.y + by.y };
    tool.pointerDown(pointer(from, options));
    tool.pointerMove(pointer({ x: from.x + by.x / 2, y: from.y + by.y / 2 }, options));
    tool.pointerMove(pointer(to, options));
    tool.pointerUp(pointer(to, options));

    return to;
}

function geometryOf(entity: Entity) {
    return entity.requireComponent(ShapeComponent).get('geometry');
}

function transformOf(entity: Entity, key: 'position' | 'scale') {
    return entity.requireComponent(TransformComponent).get(key);
}

function expectClose(actual: Point, expected: Point) {
    expect(actual.x).toBeCloseTo(expected.x, 9);
    expect(actual.y).toBeCloseTo(expected.y, 9);
}

describe('SelectionFrame', () => {
    test('one shape has eight handles on its own box, outline left out', () => {
        const { square, tool, selection } = buildResizeTest();
        selection.replace([square.id]);

        const frame = tool.frame;
        expect(frame?.kind).toBe('shape');
        expect(frame?.corners).toEqual([
            { x: 50, y: 50 },
            { x: 150, y: 50 },
            { x: 150, y: 150 },
            { x: 50, y: 150 },
        ]);
        expect(frame?.handlePosition(RIGHT)).toEqual({ x: 150, y: 100 });
    });

    test('a handle is grabbed within 4 screen px of its 8 px square, at any zoom', () => {
        const { square, tool, selection, session } = buildResizeTest();
        selection.replace([square.id]);

        expect(tool.frame?.handleAt({ x: 158, y: 100 }, 1)).toEqual(RIGHT);
        expect(tool.frame?.handleAt({ x: 159, y: 100 }, 1)).toBeUndefined();
        expect(tool.frame?.handleAt({ x: 154, y: 100 }, 2)).toEqual(RIGHT);
        expect(tool.frame?.handleAt({ x: 155, y: 100 }, 2)).toBeUndefined();
        expect(session.view.zoom).toBe(1);
    });

    test('several entities, a locked or hidden one, and the camera show no handles', () => {
        const { level, square, other, tool, selection } = buildResizeTest();

        selection.replace([square.id, other.id]);
        expect(tool.frame).toBeUndefined();

        selection.replace([level.camera.id]);
        expect(tool.frame).toBeUndefined();

        square.setLocked(true);
        selection.replace([square.id]);
        expect(tool.frame).toBeUndefined();

        other.setHidden(true);
        selection.replace([other.id]);
        expect(tool.frame).toBeUndefined();
    });

    test('a group gets a box around what its children draw, and the World its rectangle', () => {
        const { level, group, tool, selection } = buildResizeTest();

        selection.replace([group.id]);
        expect(tool.frame?.kind).toBe('group');
        // The child's 100 px square and its 2 px outline, in the group's own space.
        expect(tool.frame?.box.width).toBeCloseTo(102, 9);

        selection.replace([level.world.id]);
        expect(tool.frame?.kind).toBe('world');
    });
});

describe('SelectTool resizing', () => {
    test('a side handle changes the width, keeps the opposite side, and is one step that undo puts back', () => {
        const { square, tool, selection, history, session } = buildResizeTest();
        selection.replace([square.id]);

        dragHandle(tool, RIGHT, { x: 50, y: 30 });

        expect(geometryOf(square)).toEqual({ kind: 'rectangle', width: 150, height: 100 });
        expect(transformOf(square, 'position')).toEqual({ x: 125, y: 100 });
        expect(transformOf(square, 'scale')).toEqual({ x: 1, y: 1 });
        expect(history.undoCount).toBe(1);
        expect(history.undoLabel).toBe('Resize Entity');

        session.openLevel.editor.undo();
        expect(geometryOf(square)).toEqual(SQUARE);
        expect(transformOf(square, 'position')).toEqual({ x: 100, y: 100 });
    });

    test('a handle follows the mouse on screen under a turned, stretched, skewed parent', () => {
        const { child, tool, selection } = buildResizeTest();
        selection.replace([child.id]);
        const oppositeBefore = tool.frame?.handlePosition(TOP_LEFT);

        const to = dragHandle(tool, BOTTOM_RIGHT, { x: 37, y: -23 });

        const frame = tool.frame;
        if (frame === undefined || oppositeBefore === undefined) throw new Error('No handles after the drag.');
        expectClose(frame.handlePosition(BOTTOM_RIGHT), to);
        expectClose(frame.handlePosition(TOP_LEFT), oppositeBefore);
    });

    test('a free resize keeps the outline width, and Shift keeps proportions and stretches the outline', () => {
        const { square, other, tool, selection } = buildResizeTest();
        selection.replace([square.id]);
        dragHandle(tool, BOTTOM_RIGHT, { x: 100, y: 20 });
        expect(geometryOf(square)).toEqual({ kind: 'rectangle', width: 200, height: 120 });
        expect(square.requireComponent(StyleComponent).get('outlineWidth')).toBe(2);

        selection.replace([other.id]);
        dragHandle(tool, BOTTOM_RIGHT, { x: 100, y: 20 }, { shift: true });
        expect(geometryOf(other)).toEqual({ kind: 'rectangle', width: 200, height: 200 });
        expect(other.requireComponent(StyleComponent).get('outlineWidth')).toBe(4);
        expect(transformOf(other, 'position')).toEqual({ x: 350, y: 150 });
    });

    test('Alt resizes from the centre', () => {
        const { square, tool, selection } = buildResizeTest();
        selection.replace([square.id]);

        dragHandle(tool, RIGHT, { x: 50, y: 0 }, { alt: true });

        expect(geometryOf(square)).toEqual({ kind: 'rectangle', width: 200, height: 100 });
        expect(transformOf(square, 'position')).toEqual({ x: 100, y: 100 });
    });

    test('dragging past the opposite side mirrors the shape', () => {
        const { level, tool, selection } = buildResizeTest();
        const triangle = addShape(
            level,
            level.world,
            { x: 0, y: 0 },
            {
                kind: 'polygon',
                points: [
                    { x: 0, y: 0 },
                    { x: 100, y: 0 },
                    { x: 0, y: 50 },
                ],
            },
        );
        selection.replace([triangle.id]);

        dragHandle(tool, RIGHT, { x: -150, y: 0 });

        expect(geometryOf(triangle)).toEqual({
            kind: 'polygon',
            points: [
                { x: -0, y: 0 },
                { x: -50, y: 0 },
                { x: -0, y: 50 },
            ],
        });
        expect(transformOf(triangle, 'position')).toEqual({ x: 0, y: 0 });
    });

    test('a release at 0 px leaves 1 px', () => {
        const { square, tool, selection } = buildResizeTest();
        selection.replace([square.id]);

        dragHandle(tool, RIGHT, { x: -100, y: 0 });

        expect(geometryOf(square)).toEqual({ kind: 'rectangle', width: 1, height: 100 });
        expect(transformOf(square, 'position')).toEqual({ x: 50.5, y: 100 });
    });

    test('a circle stays round, its radius following the larger stretch', () => {
        const { level, tool, selection } = buildResizeTest();
        const circle = addShape(level, level.world, { x: 0, y: 0 }, { kind: 'circle', radius: 50 });
        selection.replace([circle.id]);

        dragHandle(tool, BOTTOM_RIGHT, { x: 50, y: 10 });

        expect(geometryOf(circle)).toEqual({ kind: 'circle', radius: 75 });
        expect(transformOf(circle, 'position')).toEqual({ x: 25, y: 25 });
        expect(circle.requireComponent(StyleComponent).get('outlineWidth')).toBe(2);
    });

    test("a group's resize changes its scale and leaves its children alone", () => {
        const { group, child, tool, selection } = buildResizeTest();
        selection.replace([group.id]);
        const frame = tool.frame;
        if (frame === undefined) throw new Error('A group has handles.');
        const handle = frame.handlePosition(RIGHT);
        const opposite = frame.handlePosition({ x: -1, y: 0 });
        // Twice as far from the opposite side, along the group's own x axis.
        const by = { x: handle.x - opposite.x, y: handle.y - opposite.y };

        dragHandle(tool, RIGHT, by);

        const scale = transformOf(group, 'scale');
        expect(scale.x).toBeCloseTo(4, 9);
        expect(scale.y).toBeCloseTo(0.5, 9);
        expect(geometryOf(child)).toEqual(SQUARE);
        expectClose(tool.frame?.handlePosition({ x: -1, y: 0 }) ?? { x: NaN, y: NaN }, opposite);
    });

    test("the World's rectangle resizes from its centre and never moves", () => {
        const { level, tool, selection } = buildResizeTest();
        selection.replace([level.world.id]);
        const before = geometryOf(level.world);
        if (before.kind !== 'rectangle') throw new Error("The World's shape is a rectangle.");

        dragHandle(tool, RIGHT, { x: 100, y: 0 });

        expect(geometryOf(level.world)).toEqual({ ...before, width: before.width + 200 });
        expect(transformOf(level.world, 'position')).toEqual({ x: 0, y: 0 });
    });

    test('the handle snaps to the grid unless Ctrl is held', () => {
        const { square, tool, selection } = buildResizeTest();
        selection.replace([square.id]);

        dragHandle(tool, RIGHT, { x: 47, y: 0 }, { ctrl: false });

        expect(geometryOf(square)).toEqual({ kind: 'rectangle', width: 150, height: 100 });
    });

    test('handles hide during the drag, and Esc puts everything back with no step', () => {
        const { square, tool, selection, history, liveEdit } = buildResizeTest();
        selection.replace([square.id]);

        tool.pointerDown(pointer({ x: 150, y: 100 }));
        tool.pointerMove(pointer({ x: 220, y: 100 }));
        expect(tool.frame).toBeUndefined();
        expect(geometryOf(square)).toEqual({ kind: 'rectangle', width: 170, height: 100 });

        expect(tool.cancel()).toBe(true);
        tool.pointerUp(pointer({ x: 220, y: 100 }));

        expect(liveEdit.isActive).toBe(false);
        expect(geometryOf(square)).toEqual(SQUARE);
        expect(history.undoCount).toBe(0);
        expect(tool.frame).toBeDefined();
    });

    test('a press where a handle would be moves several entities instead', () => {
        const { square, other, tool, selection } = buildResizeTest();
        selection.replace([square.id, other.id]);

        tool.pointerDown(pointer({ x: 148, y: 100 }));
        tool.pointerMove(pointer({ x: 168, y: 100 }));
        tool.pointerUp(pointer({ x: 168, y: 100 }));

        expect(geometryOf(square)).toEqual(SQUARE);
        expect(transformOf(square, 'position')).toEqual({ x: 120, y: 100 });
    });
});
