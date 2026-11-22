import { describe, expect, test } from 'vitest';

import { labelName } from '../../../core/level/index.ts';

import {
    buildShapeTest,
    buildShapeTestWithGrid,
    click,
    drag,
    geometryOf,
    made,
    pointer,
    positionOf,
    TENS_SNAPPER,
} from './testing/shapeToolTest.ts';

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

    test("with grid snapping, a click lines up the shape's edges with the grid, not its centre", () => {
        const setup = buildShapeTestWithGrid();
        drag(setup, { x: 0, y: 0 }, { x: 150, y: 100 });
        setup.controller.pick('shape');

        // A 150 by 100 rectangle at the mouse covers 55 to 205 across and 90 to 190 down. Its edges are
        // nearest the lines at 50 and 100, so it moves 5 px left and 10 px down, and its centre is off the
        // lines.
        click(setup, { x: 130, y: 140 });

        expect(geometryOf(made(setup))).toEqual({ kind: 'rectangle', width: 150, height: 100 });
        expect(positionOf(made(setup))).toEqual({ x: 125, y: 150 });
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
            rotation: 0,
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

    test('Ctrl+Shift draws from the centre only, with no square and snapping on', () => {
        const plain = buildShapeTest();
        drag(plain, { x: 0, y: 0 }, { x: 200, y: 50 }, { ctrl: true, shift: true });
        expect(geometryOf(made(plain))).toEqual({ kind: 'rectangle', width: 400, height: 100 });
        expect(positionOf(made(plain))).toEqual({ x: 0, y: 0 });

        const snapped = buildShapeTest(TENS_SNAPPER);
        drag(snapped, { x: 2, y: 3 }, { x: 98, y: 41 }, { ctrl: true, shift: true });
        expect(geometryOf(made(snapped))).toEqual({ kind: 'rectangle', width: 200, height: 80 });
        expect(positionOf(made(snapped))).toEqual({ x: 0, y: 0 });

        const circle = buildShapeTest();
        circle.tool.chooseKind('circle');
        drag(circle, { x: 0, y: 0 }, { x: 100, y: 40 }, { ctrl: true, shift: true });
        expect(geometryOf(made(circle))).toEqual({ kind: 'circle', radius: 100 });
        expect(positionOf(made(circle))).toEqual({ x: 0, y: 0 });
    });

    test('Shift pressed with Ctrl during a drag turns it to from the centre without a move', () => {
        const setup = buildShapeTest();
        setup.controller.pointerDown(pointer({ x: 0, y: 0 }));
        setup.controller.pointerMove(pointer({ x: 200, y: 100 }, { ctrl: true }));
        expect(setup.tool.readout?.text).toBe('200 × 100 px');

        setup.controller.keyDown({
            code: 'ShiftLeft',
            key: 'Shift',
            shift: true,
            alt: false,
            ctrl: true,
            repeat: false,
        });

        expect(setup.tool.readout?.text).toBe('400 × 200 px');
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
});
