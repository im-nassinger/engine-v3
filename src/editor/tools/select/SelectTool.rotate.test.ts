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

import { SelectTool } from './SelectTool.ts';

const SQUARE: ShapeGeometry = { kind: 'rectangle', width: 100, height: 100 };
// A square whose own origin is its top left corner, so its frame's centre is not its position.
const CORNER_SQUARE: ShapeGeometry = {
    kind: 'polygon',
    points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
    ],
};

function addShape(level: Level, parent: Entity, position: Point, geometry: ShapeGeometry) {
    const entity = level.createEntity(parent, 0);
    const transform = new TransformComponent();
    transform.set('position', position);
    entity.addComponent(transform);
    entity.addComponent(new ShapeComponent({ geometry }));
    entity.addComponent(new StyleComponent());

    return entity;
}

function addGroup(level: Level, values: { rotation: number; scale: Point; skew: number }) {
    const group = level.createEntity(level.world, 0);
    const transform = new TransformComponent();
    transform.set('position', { x: 600, y: 300 });
    transform.set('rotation', values.rotation);
    transform.set('scale', values.scale);
    transform.set('skew', values.skew);
    group.addComponent(transform);

    return group;
}

// A 100 px square at 100, 100, its frame from 50 to 150; a corner square in a turned, stretched and skewed
// group; and a corner square in a mirrored group. Screen and level are the same at zoom 1.
function buildRotateTest() {
    const level = Level.createNew();
    const square = addShape(level, level.world, { x: 100, y: 100 }, SQUARE);
    const other = addShape(level, level.world, { x: 400, y: 100 }, SQUARE);
    const slanted = addGroup(level, { rotation: 30, scale: { x: 2, y: 0.5 }, skew: 20 });
    const slantedChild = addShape(level, slanted, { x: 10, y: 20 }, CORNER_SQUARE);
    const mirrored = addGroup(level, { rotation: 0, scale: { x: -1, y: 1 }, skew: 0 });
    const mirroredChild = addShape(level, mirrored, { x: 0, y: 0 }, SQUARE);

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

    return { level, square, other, slantedChild, mirroredChild, session, tool, selection, history, liveEdit };
}

function pointer(position: Point, options: Partial<Modifiers> = {}): LevelPointerInput {
    return {
        levelPosition: position,
        screenPosition: position,
        button: 'left',
        modifiers: { shift: options.shift ?? false, alt: options.alt ?? false, ctrl: options.ctrl ?? true },
        clickCount: 1,
    };
}

// The point at that angle, clockwise on screen from the x axis, and that distance from the centre.
function around(centre: Point, degrees: number, distance: number): Point {
    const radians = (degrees * Math.PI) / 180;

    return { x: centre.x + Math.cos(radians) * distance, y: centre.y + Math.sin(radians) * distance };
}

function rotationOf(entity: Entity) {
    return entity.requireComponent(TransformComponent).get('rotation');
}

function positionOf(entity: Entity) {
    return entity.requireComponent(TransformComponent).get('position');
}

function frameCentre(tool: SelectTool) {
    const frame = tool.frame;
    if (frame === undefined) throw new Error('No frame.');

    return frame.matrix.apply(frame.box.centre);
}

// The frame's third corner, its bottom right in the entity's own space.
function thirdCorner(corners: readonly { x: number; y: number }[]) {
    const corner = corners[2];
    if (corner === undefined) throw new Error('The frame has no third corner.');
    return corner;
}

// Presses just outside the frame's third corner, 10 px out on screen, then moves round the centre through each angle.
function rotateThrough(tool: SelectTool, angles: readonly number[], options: Partial<Modifiers> = {}) {
    const frame = tool.frame;
    if (frame === undefined) throw new Error('No frame.');

    const centre = frameCentre(tool);
    const corner = thirdCorner(frame.corners);
    const press = {
        x: corner.x + 10 * Math.sign(corner.x - centre.x),
        y: corner.y + 10 * Math.sign(corner.y - centre.y),
    };
    const distance = Math.hypot(press.x - centre.x, press.y - centre.y);
    const startAngle = (Math.atan2(press.y - centre.y, press.x - centre.x) * 180) / Math.PI;
    tool.pointerDown(pointer(press, options));

    let last = press;
    for (const angle of angles) {
        last = around(centre, startAngle + angle, distance);
        tool.pointerMove(pointer(last, options));
    }

    return last;
}

describe('the rotate area', () => {
    test('is a 16 screen px square just outside each corner, a handle winning', () => {
        const { square, tool, selection } = buildRotateTest();
        selection.replace([square.id]);
        const frame = tool.frame;

        expect(frame?.isOnRotateArea({ x: 160, y: 160 }, 1)).toBe(true);
        expect(frame?.isOnRotateArea({ x: 40, y: 40 }, 1)).toBe(true);
        expect(frame?.isOnRotateArea({ x: 166, y: 166 }, 1)).toBe(true);
        expect(frame?.isOnRotateArea({ x: 167, y: 160 }, 1)).toBe(false);
        expect(frame?.isOnRotateArea({ x: 158, y: 158 }, 1)).toBe(false);
        expect(frame?.isOnRotateArea({ x: 160, y: 140 }, 1)).toBe(false);
        expect(frame?.isOnRotateArea({ x: 140, y: 140 }, 1)).toBe(false);
    });

    test('keeps its size on screen at any zoom', () => {
        const { square, tool, selection } = buildRotateTest();
        selection.replace([square.id]);

        expect(tool.frame?.isOnRotateArea({ x: 157, y: 157 }, 2)).toBe(true);
        expect(tool.frame?.isOnRotateArea({ x: 159, y: 159 }, 2)).toBe(false);
    });

    test('the World has none', () => {
        const { level, tool, selection } = buildRotateTest();
        selection.replace([level.world.id]);
        const frame = tool.frame;
        if (frame === undefined) throw new Error('The World has a frame.');

        const corner = thirdCorner(frame.corners);
        expect(frame.isOnRotateArea({ x: corner.x + 10, y: corner.y + 10 }, 1)).toBe(false);
    });
});

describe('RotateState', () => {
    test('turns around the centre as the mouse turns, in one step that undo puts back', () => {
        const { square, tool, selection, history, session } = buildRotateTest();
        selection.replace([square.id]);

        const last = rotateThrough(tool, [30, 60, 90]);
        tool.pointerUp(pointer(last));

        expect(rotationOf(square)).toBeCloseTo(90, 9);
        expect(positionOf(square).x).toBeCloseTo(100, 9);
        expect(positionOf(square).y).toBeCloseTo(100, 9);
        expect(history.undoCount).toBe(1);
        expect(history.undoLabel).toBe('Rotate Entity');

        session.openLevel.editor.undo();
        expect(rotationOf(square)).toBe(0);
    });

    test("keeps the frame's centre in place on screen under a turned, stretched and skewed parent", () => {
        const { slantedChild, tool, selection } = buildRotateTest();
        selection.replace([slantedChild.id]);
        const centreBefore = frameCentre(tool);

        const last = rotateThrough(tool, [40, 70]);
        tool.pointerUp(pointer(last));

        const centreAfter = frameCentre(tool);
        expect(rotationOf(slantedChild)).toBeCloseTo(70, 9);
        expect(centreAfter.x).toBeCloseTo(centreBefore.x, 9);
        expect(centreAfter.y).toBeCloseTo(centreBefore.y, 9);
    });

    test('Shift gives a multiple of 15°', () => {
        const { square, tool, selection } = buildRotateTest();
        selection.replace([square.id]);

        const last = rotateThrough(tool, [37], { shift: true });
        tool.pointerUp(pointer(last, { shift: true }));

        expect(rotationOf(square)).toBe(30);
    });

    test('going round more than half a turn keeps counting', () => {
        const { square, tool, selection } = buildRotateTest();
        selection.replace([square.id]);

        const last = rotateThrough(tool, [90, 180, 270, 360]);
        tool.pointerUp(pointer(last));

        expect(rotationOf(square)).toBeCloseTo(360, 9);
    });

    test('under a mirroring parent, a clockwise turn on screen is a counterclockwise Rotation', () => {
        const { mirroredChild, tool, selection } = buildRotateTest();
        selection.replace([mirroredChild.id]);

        const last = rotateThrough(tool, [45]);
        tool.pointerUp(pointer(last));

        expect(rotationOf(mirroredChild)).toBeCloseTo(-45, 9);
    });

    test('Esc puts it back and makes no step', () => {
        const { square, tool, selection, history, liveEdit } = buildRotateTest();
        selection.replace([square.id]);

        rotateThrough(tool, [50]);
        expect(tool.cancel()).toBe(true);

        expect(rotationOf(square)).toBe(0);
        expect(liveEdit.isActive).toBe(false);
        expect(history.undoCount).toBe(0);
        expect(tool.readout).toBeUndefined();
    });

    test('several entities have no rotate area, so the press selects instead', () => {
        const { square, other, tool, selection, history } = buildRotateTest();
        selection.replace([square.id, other.id]);

        tool.pointerDown(pointer({ x: 160, y: 160 }));
        tool.pointerMove(pointer({ x: 100, y: 200 }));
        tool.pointerUp(pointer({ x: 100, y: 200 }));

        expect(rotationOf(square)).toBe(0);
        expect(history.undoCount).toBe(0);
    });
});

describe('the readout', () => {
    test('rotating shows the new Rotation at the mouse, hidden on release', () => {
        const { square, tool, selection } = buildRotateTest();
        selection.replace([square.id]);

        const last = rotateThrough(tool, [45]);
        expect(tool.readout?.text).toBe('45°');
        expect(tool.readout?.at).toEqual(last);

        tool.pointerUp(pointer(last));
        expect(tool.readout).toBeUndefined();
    });

    test('moving shows the distance moved', () => {
        const { square, tool, selection } = buildRotateTest();
        selection.replace([square.id]);

        tool.pointerDown(pointer({ x: 100, y: 100 }));
        tool.pointerMove(pointer({ x: 220, y: 60 }));

        expect(tool.readout?.text).toBe('120, −40 px');
        tool.pointerUp(pointer({ x: 220, y: 60 }));
        expect(tool.readout).toBeUndefined();
    });

    test('resizing shows the new size', () => {
        const { square, tool, selection } = buildRotateTest();
        selection.replace([square.id]);

        tool.pointerDown(pointer({ x: 150, y: 100 }));
        tool.pointerMove(pointer({ x: 250, y: 100 }));

        expect(tool.readout?.text).toBe('200 × 100 px');
    });
});
