import { describe, expect, test } from 'vitest';

import type { Point } from '../../../core/geometry/index.ts';

import {
    ENTER,
    buildShapeTest,
    click,
    geometryOf,
    letter,
    made,
    pointer,
    positionOf,
} from './testing/shapeToolTest.ts';
import type { Setup } from './testing/shapeToolTest.ts';

// The key pressed the times, each consumed by the tool.
function press(setup: Setup, key: string, times = 1, shift = false) {
    for (let each = 0; each < times; each++) {
        expect(setup.controller.keyDown(letter(key, { shift }))).toBe(true);
    }
}

// A 10 px grid, so Shift's step is 10 px.
function buildSizeTest() {
    const setup = buildShapeTest();
    setup.level.editorData.setGridSize(10);

    return setup;
}

function expectPointsClose(actual: readonly Point[], expected: readonly Point[]) {
    expect(actual).toHaveLength(expected.length);
    actual.forEach((point, index) => {
        expect(point.x).toBeCloseTo(expected[index]?.x ?? Number.NaN);
        expect(point.y).toBeCloseTo(expected[index]?.y ?? Number.NaN);
    });
}

function polygonPoints(setup: Setup) {
    return setup.tool.polygonDrawing?.points ?? [];
}

describe('W, A, S and D with the Shape tool', () => {
    test('D is wider, A narrower, W taller and S shorter, 1 px a press and one grid step with Shift, centred on the mouse', () => {
        const setup = buildSizeTest();
        setup.controller.pointerMove(pointer({ x: 70, y: 80 }));

        press(setup, 'd', 3);
        press(setup, 'a');
        press(setup, 'w', 1, true);
        press(setup, 's');

        expect(setup.tool.drawing?.drawing).toEqual({
            geometry: { kind: 'rectangle', width: 102, height: 109 },
            position: { x: 70, y: 80 },
            rotation: 0,
        });
    });

    test('a click makes the rectangle at the size the keys set, and the next click remembers it', () => {
        const setup = buildSizeTest();
        setup.controller.pointerMove(pointer({ x: 30, y: 40 }));
        press(setup, 'a', 2, true);
        press(setup, 's', 1, true);

        click(setup, { x: 30, y: 40 });

        expect(geometryOf(made(setup))).toEqual({ kind: 'rectangle', width: 80, height: 90 });
        expect(positionOf(made(setup))).toEqual({ x: 30, y: 40 });
        setup.controller.pick('shape');
        click(setup, { x: 0, y: 0 });
        expect(geometryOf(made(setup))).toEqual({ kind: 'rectangle', width: 80, height: 90 });
    });

    test('Shift+S makes the preview one grid step shorter, stopping at 1 px', () => {
        const setup = buildSizeTest();
        setup.controller.pointerMove(pointer({ x: 0, y: 0 }));

        press(setup, 's', 12, true);
        press(setup, 's');

        expect(setup.tool.drawing?.drawing.geometry).toEqual({ kind: 'rectangle', width: 100, height: 1 });
    });

    test('a circle grows with D and W and shrinks with A and S, its width across by the step', () => {
        const setup = buildSizeTest();
        setup.tool.chooseKind('circle');
        setup.controller.pointerMove(pointer({ x: 30, y: 40 }));

        press(setup, 'd');
        expect(setup.tool.drawing?.drawing.geometry).toEqual({ kind: 'circle', radius: 50.5 });
        press(setup, 'w', 1, true);
        press(setup, 'a', 2, true);
        press(setup, 's');

        click(setup, { x: 30, y: 40 });
        expect(geometryOf(made(setup))).toEqual({ kind: 'circle', radius: 45 });
    });

    test('a turned preview grows along its own sides', () => {
        const setup = buildSizeTest();
        setup.controller.pointerMove(pointer({ x: 0, y: 0 }));
        press(setup, 'x', 9, true);

        press(setup, 'd', 1, true);

        expect(setup.tool.drawing?.drawing).toEqual({
            geometry: { kind: 'rectangle', width: 110, height: 100 },
            position: { x: 0, y: 0 },
            rotation: 90,
        });
    });

    test('a polygon in progress spreads its placed points from their middle', () => {
        const setup = buildSizeTest();
        setup.tool.chooseKind('polygon');
        click(setup, { x: 0, y: 0 });
        click(setup, { x: 100, y: 0 });
        click(setup, { x: 100, y: 50 });

        press(setup, 'd', 1, true);
        press(setup, 'w', 1, true);

        expectPointsClose(polygonPoints(setup), [
            { x: -5, y: -5 },
            { x: 105, y: -5 },
            { x: 105, y: 55 },
        ]);
        click(setup, { x: -5, y: -5 });
        expect(geometryOf(made(setup)).kind).toBe('polygon');
        expectPointsClose([positionOf(made(setup))], [{ x: 50, y: 25 }]);
    });

    test('a line grows along its length, and W and S do nothing to a flat line', () => {
        const setup = buildSizeTest();
        setup.tool.chooseKind('polygon');
        click(setup, { x: 0, y: 0 });
        click(setup, { x: 100, y: 0 });

        press(setup, 'w');
        press(setup, 's', 1, true);
        press(setup, 'a', 2, true);

        expectPointsClose(polygonPoints(setup), [
            { x: 10, y: 0 },
            { x: 90, y: 0 },
        ]);
        setup.controller.keyDown(ENTER);
        expect(geometryOf(made(setup))).toEqual({
            kind: 'line',
            points: [
                { x: -40, y: 0 },
                { x: 40, y: 0 },
            ],
        });
    });

    test('a turned line grows along its own width', () => {
        const setup = buildSizeTest();
        setup.tool.chooseKind('polygon');
        setup.controller.pointerMove(pointer({ x: 0, y: 0 }));
        press(setup, 'x', 9, true);
        click(setup, { x: 0, y: 0 });
        click(setup, { x: 0, y: 100 });

        press(setup, 'd', 1, true);

        expectPointsClose(polygonPoints(setup), [
            { x: 0, y: -5 },
            { x: 0, y: 105 },
        ]);
    });

    test('a polygon with no points yet takes the keys and changes nothing', () => {
        const setup = buildSizeTest();
        setup.tool.chooseKind('polygon');
        setup.controller.pointerMove(pointer({ x: 0, y: 0 }));

        press(setup, 'd');

        expect(polygonPoints(setup)).toEqual([]);
        expect(setup.tool.drawing).toBeUndefined();
    });

    test('during a drag the mouse sets the size and the keys change nothing', () => {
        const setup = buildSizeTest();
        setup.controller.pointerDown(pointer({ x: 0, y: 0 }));
        setup.controller.pointerMove(pointer({ x: 60, y: 40 }));

        press(setup, 'd', 1, true);

        expect(setup.tool.drawing?.drawing.geometry).toEqual({ kind: 'rectangle', width: 60, height: 40 });
        setup.controller.pointerUp(pointer({ x: 60, y: 40 }));
        expect(geometryOf(made(setup))).toEqual({ kind: 'rectangle', width: 60, height: 40 });
    });

    test('a press that has not moved yet is sized where it was pressed', () => {
        const setup = buildSizeTest();
        setup.controller.pointerMove(pointer({ x: 20, y: 30 }));
        setup.controller.pointerDown(pointer({ x: 20, y: 30 }));

        press(setup, 'w', 1, true);
        setup.controller.pointerUp(pointer({ x: 20, y: 30 }));

        expect(geometryOf(made(setup))).toEqual({ kind: 'rectangle', width: 100, height: 110 });
        expect(positionOf(made(setup))).toEqual({ x: 20, y: 30 });
    });

    test('Ctrl+S, Ctrl+A and Alt+D are left alone, and sizing makes no undo step', () => {
        const setup = buildSizeTest();
        setup.controller.pointerMove(pointer({ x: 0, y: 0 }));
        const undoBefore = setup.session.openLevel.history.undoLabel;

        expect(setup.controller.keyDown(letter('s', { ctrl: true }))).toBe(false);
        expect(setup.controller.keyDown(letter('a', { ctrl: true }))).toBe(false);
        expect(setup.controller.keyDown(letter('d', { alt: true }))).toBe(false);
        press(setup, 'd');

        expect(setup.tool.drawing?.drawing.geometry).toEqual({ kind: 'rectangle', width: 101, height: 100 });
        expect(setup.session.openLevel.history.undoLabel).toBe(undoBefore);
    });

    test('a layout with no Latin letters sizes by the physical key', () => {
        const setup = buildSizeTest();
        setup.controller.pointerMove(pointer({ x: 0, y: 0 }));

        setup.controller.keyDown({ ...letter('d'), key: 'в' });

        expect(setup.tool.drawing?.drawing.geometry).toEqual({ kind: 'rectangle', width: 101, height: 100 });
    });

    test("Shift steps by the level's grid size", () => {
        const setup = buildShapeTest();
        setup.level.editorData.setGridSize(25);
        setup.controller.pointerMove(pointer({ x: 0, y: 0 }));

        press(setup, 'd', 1, true);

        expect(setup.tool.drawing?.drawing.geometry).toEqual({ kind: 'rectangle', width: 125, height: 100 });
    });
});
