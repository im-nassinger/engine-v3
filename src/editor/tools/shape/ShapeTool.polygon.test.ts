import { describe, expect, test } from 'vitest';

import type { Point } from '../../../core/geometry/index.ts';
import { labelName } from '../../../core/level/index.ts';
import { EscapeChain } from '../escape/EscapeChain.ts';

import { buildShapeTest, click, geometryOf, made, pointer, positionOf, TENS_SNAPPER } from './testing/shapeToolTest.ts';
import type { Setup } from './testing/shapeToolTest.ts';

const ENTER = { code: 'Enter', key: 'Enter', ctrl: false, shift: false, alt: false, repeat: false };
const BACKSPACE = { code: 'Backspace', key: 'Backspace', ctrl: false, shift: false, alt: false, repeat: false };

// The Shape tool on Polygon, and the Esc chain over its controller.
function buildPolygonTest(setup: Setup = buildShapeTest()) {
    setup.tool.chooseKind('polygon');
    const escape = new EscapeChain(setup.session, setup.controller, { isOpen: () => false });

    return { ...setup, escape };
}

function clickAll(setup: Setup, points: readonly Point[]) {
    for (const point of points) {
        click(setup, point);
    }
}

function doubleClick(setup: Setup, at: Point) {
    click(setup, at);
    setup.controller.pointerDown({ ...pointer(at), clickCount: 2 });
    setup.controller.pointerUp({ ...pointer(at), clickCount: 2 });
}

function pointsOf(setup: Setup) {
    const geometry = geometryOf(made(setup));
    if (geometry.kind !== 'polygon' && geometry.kind !== 'line') throw new Error(`A ${geometry.kind}.`);

    return geometry.points;
}

function drawnSoFar(setup: Setup) {
    return setup.tool.polygonDrawing?.points ?? [];
}

const TRIANGLE: readonly Point[] = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 60 },
];

describe('the Shape tool’s polygon', () => {
    test('each click is a point, and clicking the first point closes it: one step, then Select', () => {
        const setup = buildPolygonTest();

        clickAll(setup, [...TRIANGLE, { x: 2, y: 1 }]);

        const shape = made(setup);
        expect(labelName(shape)).toBe('Polygon 1');
        expect(geometryOf(shape).kind).toBe('polygon');
        expect(positionOf(shape)).toEqual({ x: 50, y: 30 });
        expect(pointsOf(setup)).toEqual([
            { x: -50, y: -30 },
            { x: 50, y: -30 },
            { x: 50, y: 30 },
        ]);
        expect(setup.session.openLevel.history.undoCount).toBe(1);
        expect(setup.session.openLevel.history.undoLabel).toBe('Draw Polygon 1');
        expect(setup.controller.active.id).toBe('select');
    });

    test('Enter finishes it open, as a line', () => {
        const setup = buildPolygonTest();
        clickAll(setup, TRIANGLE);

        expect(setup.controller.keyDown(ENTER)).toBe(true);

        expect(labelName(made(setup))).toBe('Line 1');
        expect(geometryOf(made(setup)).kind).toBe('line');
        expect(pointsOf(setup)).toHaveLength(3);
        expect(setup.controller.active.id).toBe('select');
    });

    test('the first point closes nothing with fewer than 3 points, and the click is ignored', () => {
        const setup = buildPolygonTest();
        clickAll(setup, [TRIANGLE[0] ?? { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 1, y: 1 }]);

        expect(drawnSoFar(setup)).toHaveLength(2);
        expect(setup.session.openLevel.history.undoCount).toBe(0);
    });

    test('a click within 8 screen px of the first point closes it, measured on screen at any zoom', () => {
        const setup = buildPolygonTest();
        clickAll(setup, TRIANGLE);
        setup.session.view.zoomAt({ x: 400, y: 300 }, 2);

        click(setup, { x: 5, y: 0 });
        expect(drawnSoFar(setup)).toHaveLength(4);

        click(setup, { x: 3, y: 0 });
        expect(pointsOf(setup)).toHaveLength(4);
    });

    test('the preview shows the points, the next one, and the first point when a click would close it', () => {
        const setup = buildPolygonTest();
        setup.controller.pointerMove(pointer({ x: 7, y: 8 }));
        expect(setup.tool.polygonDrawing?.points).toEqual([]);
        expect(setup.tool.polygonDrawing?.next).toEqual({ x: 7, y: 8 });

        clickAll(setup, TRIANGLE);
        setup.controller.pointerMove(pointer({ x: 50, y: 90 }));
        expect(setup.tool.polygonDrawing).toMatchObject({ points: TRIANGLE, next: { x: 50, y: 90 }, closing: false });

        setup.controller.pointerMove(pointer({ x: 1, y: 2 }));
        expect(setup.tool.polygonDrawing).toMatchObject({ next: { x: 0, y: 0 }, closing: true });
    });

    test('the second click of a double-click adds no point and finishes it open', () => {
        const setup = buildPolygonTest();
        click(setup, { x: 0, y: 0 });

        doubleClick(setup, { x: 100, y: 0 });

        expect(labelName(made(setup))).toBe('Line 1');
        expect(pointsOf(setup)).toEqual([
            { x: -50, y: 0 },
            { x: 50, y: 0 },
        ]);
        expect(setup.controller.active.id).toBe('select');
    });

    test('a second click in the same place adds no point', () => {
        const setup = buildPolygonTest();

        clickAll(setup, [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 0 },
        ]);

        expect(drawnSoFar(setup)).toHaveLength(2);
    });

    test('Ctrl+Z and Backspace remove the last point and make no step', () => {
        const setup = buildPolygonTest();
        clickAll(setup, TRIANGLE);

        expect(setup.controller.undoDrawingStep()).toBe(true);
        expect(drawnSoFar(setup)).toHaveLength(2);
        expect(setup.controller.keyDown(BACKSPACE)).toBe(true);
        expect(drawnSoFar(setup)).toHaveLength(1);
        expect(setup.session.openLevel.history.undoCount).toBe(0);
    });

    test('removing the only point ends the drawing with nothing made, and then Ctrl+Z is Undo’s', () => {
        const setup = buildPolygonTest();
        click(setup, { x: 0, y: 0 });

        setup.controller.undoDrawingStep();

        expect(setup.tool.polygonDrawing?.points).toEqual([]);
        expect(setup.controller.undoDrawingStep()).toBe(false);
        expect(setup.controller.keyDown(BACKSPACE)).toBe(false);
        expect(setup.session.openLevel.history.undoCount).toBe(0);
    });

    test('Ctrl+Z during a rectangle drag is ignored, as during any drag', () => {
        const setup = buildShapeTest();
        setup.controller.pointerDown(pointer({ x: 0, y: 0 }));

        expect(setup.controller.undoDrawingStep()).toBe(true);
    });

    test('Esc finishes it open and keeps it, and the next Esc returns to Select', () => {
        const setup = buildPolygonTest();
        clickAll(setup, TRIANGLE);

        expect(setup.escape.press()).toBe('drawing');

        expect(labelName(made(setup))).toBe('Line 1');
        expect(setup.controller.active.id).toBe('shape');
        expect(setup.escape.press()).toBe('tool');
        expect(setup.controller.active.id).toBe('select');
    });

    test('Esc while the button is still down drops that point only', () => {
        const setup = buildPolygonTest();
        clickAll(setup, TRIANGLE);
        setup.controller.pointerDown(pointer({ x: 50, y: 90 }));

        expect(setup.escape.press()).toBe('drag');
        setup.controller.pointerUp(pointer({ x: 50, y: 90 }));

        expect(drawnSoFar(setup)).toHaveLength(3);
        expect(setup.session.openLevel.history.undoCount).toBe(0);
    });

    test('choosing another tool finishes it open and keeps it, selected', () => {
        const setup = buildPolygonTest();
        clickAll(setup, TRIANGLE);

        setup.controller.pick('select');

        expect(labelName(made(setup))).toBe('Line 1');
        expect(setup.controller.active.id).toBe('select');
        expect(setup.session.openLevel.history.undoCount).toBe(1);
    });

    test('deactivate, which Play calls, finishes it open and keeps it', () => {
        const setup = buildPolygonTest();
        clickAll(setup, TRIANGLE);

        setup.tool.deactivate();

        expect(labelName(made(setup))).toBe('Line 1');
        expect(setup.tool.polygonDrawing).toBeUndefined();
    });

    test('a drawing of fewer than 2 points is dropped however it is finished', () => {
        const enter = buildPolygonTest();
        click(enter, { x: 0, y: 0 });
        enter.controller.keyDown(ENTER);
        expect(enter.session.openLevel.history.undoCount).toBe(0);
        expect(enter.controller.active.id).toBe('shape');

        const other = buildPolygonTest();
        click(other, { x: 0, y: 0 });
        other.controller.pick('select');
        expect(other.session.openLevel.history.undoCount).toBe(0);
    });

    test('the 1,001st point is refused with a status text, and the drawing goes on', () => {
        const setup = buildPolygonTest();
        const thousand = Array.from({ length: 1000 }, (_, index) => ({ x: index * 10, y: index % 2 }));
        clickAll(setup, thousand);

        click(setup, { x: 0, y: 500 });

        expect(setup.session.status.current).toBe('A polygon holds at most 1,000 points');
        expect(drawnSoFar(setup)).toHaveLength(1000);
        setup.controller.keyDown(ENTER);
        expect(pointsOf(setup)).toHaveLength(1000);
    });

    test('points snap as points, and Ctrl turns that off', () => {
        const setup = buildPolygonTest(buildShapeTest(TENS_SNAPPER));
        click(setup, { x: 2, y: 3 });
        click(setup, { x: 98, y: 41 }, { ctrl: true });

        expect(drawnSoFar(setup)).toEqual([
            { x: 0, y: 0 },
            { x: 98, y: 41 },
        ]);
    });

    test('Shift turns the segment from the last point to a multiple of 15°, at the same length', () => {
        const setup = buildPolygonTest(buildShapeTest(TENS_SNAPPER));
        click(setup, { x: 0, y: 0 });

        click(setup, { x: 100, y: 30 }, { shift: true });

        const last = drawnSoFar(setup)[1];
        const length = Math.hypot(100, 30);
        const angle = (15 * Math.PI) / 180;
        expect(last?.x).toBeCloseTo(length * Math.cos(angle));
        expect(last?.y).toBeCloseTo(length * Math.sin(angle));
    });

    test('panning and zooming during the drawing keep the points where they are in the level', () => {
        const setup = buildPolygonTest();
        click(setup, { x: 0, y: 0 });
        click(setup, { x: 100, y: 0 });

        setup.session.view.panBy(250, -40);
        setup.session.view.zoomAt({ x: 100, y: 100 }, 0.5);
        click(setup, { x: 100, y: 100 });
        click(setup, { x: 0, y: 0 });

        expect(positionOf(made(setup))).toEqual({ x: 50, y: 50 });
        expect(pointsOf(setup)).toHaveLength(3);
    });

    test('inside a rotated group the points are in the group’s own space', () => {
        const setup = buildPolygonTest();
        setup.session.openLevel.currentGroup.enter(setup.group);

        clickAll(setup, [
            { x: 400, y: 300 },
            { x: 400, y: 400 },
        ]);
        setup.controller.keyDown(ENTER);

        const shape = made(setup);
        expect(shape.parent).toBe(setup.group);
        const [first, second] = pointsOf(setup);
        expect(first?.x).toBeCloseTo(-50);
        expect(first?.y).toBeCloseTo(0);
        expect(second?.x).toBeCloseTo(50);
        expect(second?.y).toBeCloseTo(0);
    });

    test('the first point inside a locked group is refused with a status text', () => {
        const setup = buildPolygonTest();
        setup.group.setLocked(true);
        setup.session.openLevel.currentGroup.enter(setup.group);

        click(setup, { x: 0, y: 0 });

        expect(setup.session.status.current).toBe('This group is locked');
        expect(drawnSoFar(setup)).toEqual([]);
    });

    test('changing the kind during a drawing keeps drawing the polygon', () => {
        const setup = buildPolygonTest();
        clickAll(setup, TRIANGLE.slice(0, 2));

        setup.tool.chooseKind('rectangle');
        click(setup, { x: 100, y: 60 });

        expect(drawnSoFar(setup)).toHaveLength(3);
    });
});
