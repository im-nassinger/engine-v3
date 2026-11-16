import { describe, expect, test } from 'vitest';

import { ShapeComponent, StyleComponent, TransformComponent } from '../../../core/components/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import { Level, labelName } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { createCommandRegistry } from '../../commands/index.ts';
import { EditorSession } from '../../session/index.ts';
import type { SnapResult, Snapper } from '../../snapping/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { PanGesture } from '../pan/PanGesture.ts';
import { SelectTool } from '../select/SelectTool.ts';
import type { LevelPointerInput, Modifiers } from '../Tool.ts';
import { ToolController } from '../ToolController.ts';

import { ShapeTool } from './ShapeTool.ts';

// Rounds a point to the nearest 10 px, unless Ctrl is held.
const TENS_SNAPPER: Snapper = {
    snapMove: (_bounds, offset): SnapResult => ({ point: offset, snappedX: false, snappedY: false }),
    snapPoint: (point, _view, options): SnapResult => {
        if (options.ctrlHeld) return { point, snappedX: false, snappedY: false };

        const snapped = { x: Math.round(point.x / 10) * 10, y: Math.round(point.y / 10) * 10 };

        return { point: snapped, snappedX: true, snappedY: true };
    },
};

const NO_SNAPPING: Snapper = {
    snapMove: (_bounds, offset): SnapResult => ({ point: offset, snappedX: false, snappedY: false }),
    snapPoint: (point): SnapResult => ({ point, snappedX: false, snappedY: false }),
};

// A level with a square selected and a group at 400, 300 turned 90°, the Select and Shape tools under
// one controller, and the Shape tool picked. Screen and level positions are the same.
function buildShapeTest(snapper: Snapper = NO_SNAPPING) {
    const level = Level.createNew();
    const square = level.createEntity(level.world, 0);
    square.addComponent(new TransformComponent());
    square.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width: 10, height: 10 } }));
    square.addComponent(new StyleComponent());
    const group = level.createEntity(level.world, 0);
    group.addComponent(
        new TransformComponent({ position: { x: 400, y: 300 }, rotation: 90, scale: { x: 1, y: 1 }, skew: 0 }),
    );

    const timer = new ManualTimer();
    const session = new EditorSession({ level, clock: timer.clock, timer, frames: new ManualFrames() });
    session.view.setSize(800, 600);
    session.openLevel.selection.replace([square.id]);
    const services = {
        get openLevel() {
            return session.openLevel;
        },
        view: session.view,
        snapper,
        commands: createCommandRegistry(session),
        status: session.status,
        reader: session.reader,
    };
    const tool = new ShapeTool();
    const controller = new ToolController([new SelectTool(), tool], services, new PanGesture(session.view));
    controller.pick('shape');

    return { level, square, group, session, tool, controller };
}

type Setup = ReturnType<typeof buildShapeTest>;

function pointer(position: Point, modifiers: Partial<Modifiers> = {}): LevelPointerInput {
    return {
        levelPosition: position,
        screenPosition: position,
        button: 'left',
        modifiers: { shift: modifiers.shift ?? false, alt: modifiers.alt ?? false, ctrl: modifiers.ctrl ?? false },
        clickCount: 1,
    };
}

function click(setup: Setup, at: Point, modifiers: Partial<Modifiers> = {}) {
    setup.controller.pointerMove(pointer(at, modifiers));
    setup.controller.pointerDown(pointer(at, modifiers));
    setup.controller.pointerUp(pointer(at, modifiers));
}

function drag(setup: Setup, from: Point, to: Point, modifiers: Partial<Modifiers> = {}) {
    setup.controller.pointerDown(pointer(from, modifiers));
    setup.controller.pointerMove(pointer(to, modifiers));
    setup.controller.pointerUp(pointer(to, modifiers));
}

// The shape just made: the one selected.
function made(setup: Setup): Entity {
    const ids = setup.session.openLevel.selection.ids;
    if (ids.length !== 1) throw new Error(`${String(ids.length)} entities are selected.`);

    return setup.level.requireEntity(ids[0] ?? 0);
}

function geometryOf(entity: Entity) {
    return entity.requireComponent(ShapeComponent).get('geometry');
}

function positionOf(entity: Entity) {
    return entity.requireComponent(TransformComponent).get('position');
}

describe('the Shape tool', () => {
    test('choosing it clears the selection, and it starts on a rectangle', () => {
        const setup = buildShapeTest();

        expect(setup.session.openLevel.selection.ids).toEqual([]);
        expect(setup.tool.kind).toBe('rectangle');
    });

    test('a click places a 100 x 100 rectangle centred on the mouse, selected, and returns to Select', () => {
        const setup = buildShapeTest();

        click(setup, { x: 30, y: 40 });

        const shape = made(setup);
        expect(labelName(shape)).toBe('Rectangle 1');
        expect(geometryOf(shape)).toEqual({ kind: 'rectangle', width: 100, height: 100 });
        expect(positionOf(shape)).toEqual({ x: 30, y: 40 });
        expect(setup.controller.active.id).toBe('select');
        expect(setup.session.openLevel.history.undoLabel).toBe('Draw Rectangle 1');
    });

    test('a click places a circle 50 px in radius', () => {
        const setup = buildShapeTest();
        setup.tool.chooseKind('circle');

        click(setup, { x: 30, y: 40 });

        const shape = made(setup);
        expect(labelName(shape)).toBe('Circle 1');
        expect(geometryOf(shape)).toEqual({ kind: 'circle', radius: 50 });
        expect(positionOf(shape)).toEqual({ x: 30, y: 40 });
    });

    test('the preview follows the mouse and shows what a click places', () => {
        const setup = buildShapeTest();

        setup.controller.pointerMove(pointer({ x: 70, y: 80 }));

        expect(setup.tool.drawing?.drawing).toEqual({
            geometry: { kind: 'rectangle', width: 100, height: 100 },
            position: { x: 70, y: 80 },
        });
        setup.tool.chooseKind('circle');
        expect(setup.tool.drawing?.drawing.geometry).toEqual({ kind: 'circle', radius: 50 });
    });

    test('a drag draws the rectangle from the press to the mouse, either way round', () => {
        const setup = buildShapeTest();

        drag(setup, { x: 100, y: 100 }, { x: -100, y: 0 });

        const shape = made(setup);
        expect(geometryOf(shape)).toEqual({ kind: 'rectangle', width: 200, height: 100 });
        expect(positionOf(shape)).toEqual({ x: 0, y: 50 });
    });

    test('Shift keeps a square, Alt draws from the centre, both a square from the centre', () => {
        const shift = buildShapeTest();
        drag(shift, { x: 0, y: 0 }, { x: 200, y: 50 }, { shift: true });
        expect(geometryOf(made(shift))).toEqual({ kind: 'rectangle', width: 200, height: 200 });
        expect(positionOf(made(shift))).toEqual({ x: 100, y: 100 });

        const alt = buildShapeTest();
        drag(alt, { x: 0, y: 0 }, { x: 200, y: 50 }, { alt: true });
        expect(geometryOf(made(alt))).toEqual({ kind: 'rectangle', width: 400, height: 100 });
        expect(positionOf(made(alt))).toEqual({ x: 0, y: 0 });

        const both = buildShapeTest();
        drag(both, { x: 0, y: 0 }, { x: -200, y: 50 }, { shift: true, alt: true });
        expect(geometryOf(made(both))).toEqual({ kind: 'rectangle', width: 400, height: 400 });
        expect(positionOf(made(both))).toEqual({ x: 0, y: 0 });
    });

    test('a circle’s drag gives the circle that fits the box, as if Shift were held, and Alt from the centre', () => {
        const setup = buildShapeTest();
        setup.tool.chooseKind('circle');
        drag(setup, { x: 0, y: 0 }, { x: 100, y: 40 });
        expect(geometryOf(made(setup))).toEqual({ kind: 'circle', radius: 50 });
        expect(positionOf(made(setup))).toEqual({ x: 50, y: 50 });

        const alt = buildShapeTest();
        alt.tool.chooseKind('circle');
        drag(alt, { x: 0, y: 0 }, { x: 100, y: 40 }, { alt: true });
        expect(geometryOf(made(alt))).toEqual({ kind: 'circle', radius: 100 });
        expect(positionOf(made(alt))).toEqual({ x: 0, y: 0 });
    });

    test('a drag’s size is remembered for the next click, each kind its own', () => {
        const setup = buildShapeTest();
        drag(setup, { x: 0, y: 0 }, { x: 60, y: 20 });
        setup.controller.pick('shape');

        click(setup, { x: 500, y: 500 });

        expect(geometryOf(made(setup))).toEqual({ kind: 'rectangle', width: 60, height: 20 });
        setup.controller.pick('shape');
        setup.tool.chooseKind('circle');
        click(setup, { x: 500, y: 500 });
        expect(geometryOf(made(setup))).toEqual({ kind: 'circle', radius: 50 });
    });

    test('a press that moves less than 4 screen px is a click', () => {
        const setup = buildShapeTest();

        drag(setup, { x: 0, y: 0 }, { x: 3, y: 0 });

        expect(geometryOf(made(setup))).toEqual({ kind: 'rectangle', width: 100, height: 100 });
        expect(positionOf(made(setup))).toEqual({ x: 0, y: 0 });
    });

    test('a 0 px drag gives 1 px sides, and a circle 1 px across', () => {
        const setup = buildShapeTest();
        drag(setup, { x: 0, y: 0 }, { x: 10, y: 0 });
        expect(geometryOf(made(setup))).toEqual({ kind: 'rectangle', width: 10, height: 1 });

        const circle = buildShapeTest();
        circle.tool.chooseKind('circle');
        circle.controller.pointerDown(pointer({ x: 0, y: 0 }));
        circle.controller.pointerMove(pointer({ x: 10, y: 0 }));
        circle.controller.pointerUp(pointer({ x: 0, y: 0 }));
        expect(geometryOf(made(circle))).toEqual({ kind: 'circle', radius: 0.5 });
    });

    test('the readout shows the size during a drag, a circle’s across, and goes on release', () => {
        const setup = buildShapeTest();
        setup.controller.pointerDown(pointer({ x: 0, y: 0 }));
        setup.controller.pointerMove(pointer({ x: 200, y: 100 }));
        expect(setup.tool.readout).toEqual({ text: '200 × 100 px', at: { x: 200, y: 100 } });
        setup.controller.pointerUp(pointer({ x: 200, y: 100 }));
        expect(setup.tool.readout).toBeUndefined();

        const circle = buildShapeTest();
        circle.tool.chooseKind('circle');
        circle.controller.pointerDown(pointer({ x: 0, y: 0 }));
        circle.controller.pointerMove(pointer({ x: 100, y: 30 }));
        expect(circle.tool.readout?.text).toBe('⌀ 100 px');
    });

    test('Shift pressed during a drag changes it without a move', () => {
        const setup = buildShapeTest();
        setup.controller.pointerDown(pointer({ x: 0, y: 0 }));
        setup.controller.pointerMove(pointer({ x: 200, y: 100 }));

        setup.controller.keyDown({
            code: 'ShiftLeft',
            key: 'Shift',
            shift: true,
            alt: false,
            ctrl: false,
            repeat: false,
        });

        expect(setup.tool.readout?.text).toBe('200 × 200 px');
    });

    test('the press and the moving corner snap as points, and Ctrl turns that off', () => {
        const snapped = buildShapeTest(TENS_SNAPPER);
        drag(snapped, { x: 2, y: 3 }, { x: 98, y: 41 });
        expect(geometryOf(made(snapped))).toEqual({ kind: 'rectangle', width: 100, height: 40 });

        const free = buildShapeTest(TENS_SNAPPER);
        drag(free, { x: 2, y: 3 }, { x: 98, y: 41 }, { ctrl: true });
        expect(geometryOf(made(free))).toEqual({ kind: 'rectangle', width: 96, height: 38 });
    });

    test('Esc during a drag makes nothing and keeps the tool', () => {
        const setup = buildShapeTest();
        setup.controller.pointerDown(pointer({ x: 0, y: 0 }));
        setup.controller.pointerMove(pointer({ x: 200, y: 100 }));

        expect(setup.controller.cancelDrag()).toBe(true);
        setup.controller.pointerUp(pointer({ x: 200, y: 100 }));

        expect(setup.session.openLevel.history.undoCount).toBe(0);
        expect(setup.controller.active.id).toBe('shape');
        expect(setup.tool.readout).toBeUndefined();
        expect(setup.tool.cancel()).toBe(false);
    });

    test('a locked tool stays on Shape after a shape is finished', () => {
        const setup = buildShapeTest();
        setup.controller.pick('shape');

        click(setup, { x: 0, y: 0 });
        click(setup, { x: 200, y: 0 });

        expect(setup.controller.active.id).toBe('shape');
        expect(setup.session.openLevel.history.undoCount).toBe(2);
        expect(labelName(made(setup))).toBe('Rectangle 2');
    });

    test('inside a rotated group the box is drawn along the group’s sides', () => {
        const setup = buildShapeTest();
        setup.session.openLevel.currentGroup.enter(setup.group);

        drag(setup, { x: 400, y: 300 }, { x: 420, y: 350 });

        const shape = made(setup);
        expect(shape.parent).toBe(setup.group);
        const geometry = geometryOf(shape);
        if (geometry.kind !== 'rectangle') throw new Error('Not a rectangle.');
        expect(geometry.width).toBeCloseTo(50);
        expect(geometry.height).toBeCloseTo(20);
        const centre = setup.session.openLevel.caches.worldMatrices.matrixOf(shape).apply({ x: 0, y: 0 });
        expect(centre.x).toBeCloseTo(410);
        expect(centre.y).toBeCloseTo(325);
    });

    test('inside a locked group a press is refused with a status text and makes nothing', () => {
        const setup = buildShapeTest();
        setup.group.setLocked(true);
        setup.session.openLevel.currentGroup.enter(setup.group);

        click(setup, { x: 0, y: 0 });

        expect(setup.session.status.current).toBe('This group is locked');
        expect(setup.session.openLevel.history.undoCount).toBe(0);
        expect(setup.controller.active.id).toBe('shape');
    });

    test('choosing another tool during a drag makes nothing', () => {
        const setup = buildShapeTest();
        setup.controller.pointerDown(pointer({ x: 0, y: 0 }));
        setup.controller.pointerMove(pointer({ x: 200, y: 100 }));

        setup.controller.pick('select');

        expect(setup.session.openLevel.history.undoCount).toBe(0);
        expect(setup.tool.drawing).toBeUndefined();
    });

    test('the hint follows the kind', () => {
        const setup = buildShapeTest();
        expect(setup.controller.hint).toContain('Click to place, drag to size.');

        setup.tool.chooseKind('polygon');

        expect(setup.controller.hint).toContain('Click to add points.');
    });
});
