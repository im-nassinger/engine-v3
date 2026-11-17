import { describe, expect, test } from 'vitest';

import { TransformComponent } from '../../../core/components/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import type { ToolKey } from '../Tool.ts';

import { buildShapeTest, click, drag, geometryOf, made, pointer, positionOf } from './testing/shapeToolTest.ts';
import type { Setup } from './testing/shapeToolTest.ts';

const ENTER = { code: 'Enter', key: 'Enter', ctrl: false, shift: false, alt: false, repeat: false };

function letter(key: string, modifiers: Partial<Pick<ToolKey, 'ctrl' | 'shift' | 'alt'>> = {}): ToolKey {
    const shift = modifiers.shift ?? false;

    return {
        code: `Key${key.toUpperCase()}`,
        key: shift ? key.toUpperCase() : key,
        ctrl: modifiers.ctrl ?? false,
        shift,
        alt: modifiers.alt ?? false,
        repeat: false,
    };
}

// Shift+X pressed the times, 10° clockwise each.
function turnClockwise(setup: Setup, presses: number) {
    for (let press = 0; press < presses; press++) {
        expect(setup.controller.keyDown(letter('x', { shift: true }))).toBe(true);
    }
}

function rotationOf(entity: Entity) {
    return entity.requireComponent(TransformComponent).get('rotation');
}

function pointsOf(entity: Entity) {
    const geometry = geometryOf(entity);
    if (geometry.kind !== 'polygon' && geometry.kind !== 'line') throw new Error(`${geometry.kind} has no points.`);

    return geometry.points;
}

function expectPointsClose(actual: readonly Point[], expected: readonly Point[]) {
    expect(actual).toHaveLength(expected.length);
    actual.forEach((point, index) => {
        expect(point.x).toBeCloseTo(expected[index]?.x ?? Number.NaN);
        expect(point.y).toBeCloseTo(expected[index]?.y ?? Number.NaN);
    });
}

function levelPointsOf(setup: Setup, entity: Entity) {
    const matrix = setup.session.openLevel.caches.worldMatrices.matrixOf(entity);

    return pointsOf(entity).map((point) => matrix.apply(point));
}

describe('Z and X with the Shape tool', () => {
    test('Z turns the preview 1° counter-clockwise and Shift+X 10° clockwise, around its centre', () => {
        const setup = buildShapeTest();
        setup.controller.pointerMove(pointer({ x: 70, y: 80 }));

        expect(setup.controller.keyDown(letter('z'))).toBe(true);
        expect(setup.tool.drawing?.drawing.rotation).toBe(-1);
        turnClockwise(setup, 1);

        expect(setup.tool.drawing?.drawing).toEqual({
            geometry: { kind: 'rectangle', width: 100, height: 100 },
            position: { x: 70, y: 80 },
            rotation: 9,
        });
    });

    test('a click makes the rectangle at the preview’s rotation, its size and place unchanged', () => {
        const setup = buildShapeTest();
        setup.controller.pointerMove(pointer({ x: 30, y: 40 }));
        turnClockwise(setup, 3);

        click(setup, { x: 30, y: 40 });

        const shape = made(setup);
        expect(rotationOf(shape)).toBe(30);
        expect(geometryOf(shape)).toEqual({ kind: 'rectangle', width: 100, height: 100 });
        expect(positionOf(shape)).toEqual({ x: 30, y: 40 });
        expect(setup.session.openLevel.history.undoLabel).toBe('Draw Rectangle 1');
    });

    test('a click makes the circle at the preview’s rotation', () => {
        const setup = buildShapeTest();
        setup.tool.chooseKind('circle');
        setup.controller.pointerMove(pointer({ x: 30, y: 40 }));
        setup.controller.keyDown(letter('z', { shift: true }));
        setup.controller.keyDown(letter('z'));

        click(setup, { x: 30, y: 40 });

        expect(rotationOf(made(setup))).toBe(-11);
        expect(geometryOf(made(setup))).toEqual({ kind: 'circle', radius: 50 });
    });

    test('a turned drag measures the box along its own sides, from the press to the mouse', () => {
        const setup = buildShapeTest();
        setup.controller.pointerMove(pointer({ x: 0, y: 0 }));
        turnClockwise(setup, 9);

        drag(setup, { x: 0, y: 0 }, { x: 50, y: 200 });

        const shape = made(setup);
        expect(rotationOf(shape)).toBe(90);
        expect(geometryOf(shape)).toEqual({ kind: 'rectangle', width: 200, height: 50 });
        expectPointsClose([positionOf(shape)], [{ x: 25, y: 100 }]);
    });

    test('turning during a drag turns the box at once', () => {
        const setup = buildShapeTest();
        setup.controller.pointerDown(pointer({ x: 0, y: 0 }));
        setup.controller.pointerMove(pointer({ x: 200, y: 50 }));

        turnClockwise(setup, 9);

        expect(setup.tool.drawing?.drawing.rotation).toBe(90);
        expect(setup.tool.drawing?.drawing.geometry).toEqual({ kind: 'rectangle', width: 50, height: 200 });
    });

    test('a polygon is made at the rotation, its points where they were clicked', () => {
        const setup = buildShapeTest();
        setup.tool.chooseKind('polygon');
        setup.controller.pointerMove(pointer({ x: 0, y: 0 }));
        turnClockwise(setup, 9);
        const placed = [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 50 },
        ];

        for (const point of placed) {
            click(setup, point);
        }
        click(setup, { x: 0, y: 0 });

        const shape = made(setup);
        expect(geometryOf(shape).kind).toBe('polygon');
        expect(rotationOf(shape)).toBe(90);
        expectPointsClose([positionOf(shape)], [{ x: 50, y: 25 }]);
        expectPointsClose(levelPointsOf(setup, shape), placed);
        expectPointsClose(pointsOf(shape), [
            { x: -25, y: 50 },
            { x: -25, y: -50 },
            { x: 25, y: -50 },
        ]);
    });

    test('turning a line in progress turns its placed points around their middle', () => {
        const setup = buildShapeTest();
        setup.tool.chooseKind('polygon');
        click(setup, { x: 0, y: 0 });
        click(setup, { x: 100, y: 0 });

        turnClockwise(setup, 9);

        expectPointsClose(setup.tool.polygonDrawing?.points ?? [], [
            { x: 50, y: -50 },
            { x: 50, y: 50 },
        ]);
        setup.controller.keyDown(ENTER);
        const line = made(setup);
        expect(geometryOf(line).kind).toBe('line');
        expect(rotationOf(line)).toBe(90);
        expectPointsClose([positionOf(line)], [{ x: 50, y: 0 }]);
        expectPointsClose(pointsOf(line), [
            { x: -50, y: 0 },
            { x: 50, y: 0 },
        ]);
    });

    test('in a mirrored group X still turns clockwise on screen', () => {
        const setup = buildShapeTest();
        const transform = setup.group.requireComponent(TransformComponent);
        transform.set('rotation', 0);
        transform.set('scale', { x: -1, y: 1 });
        setup.session.openLevel.currentGroup.enter(setup.group);
        setup.controller.pointerMove(pointer({ x: 400, y: 300 }));

        setup.controller.keyDown(letter('x'));

        expect(setup.tool.drawing?.drawing.rotation).toBe(-1);
    });

    test('a layout with no Latin letters turns by the physical key', () => {
        const setup = buildShapeTest();
        setup.controller.pointerMove(pointer({ x: 0, y: 0 }));

        setup.controller.keyDown({ ...letter('z'), key: 'я' });

        expect(setup.tool.drawing?.drawing.rotation).toBe(-1);
    });

    test('Ctrl+Z and Ctrl+X are left to Undo and Cut, and Alt+Z turns nothing', () => {
        const setup = buildShapeTest();
        setup.controller.pointerMove(pointer({ x: 0, y: 0 }));

        expect(setup.controller.keyDown(letter('z', { ctrl: true }))).toBe(false);
        expect(setup.controller.keyDown(letter('x', { ctrl: true }))).toBe(false);
        expect(setup.controller.keyDown(letter('z', { alt: true }))).toBe(false);
        expect(setup.tool.drawing?.drawing.rotation).toBe(0);
    });

    test('turning makes no undo step, and picking the tool again starts straight', () => {
        const setup = buildShapeTest();
        setup.controller.pointerMove(pointer({ x: 0, y: 0 }));
        const undoBefore = setup.session.openLevel.history.undoLabel;

        turnClockwise(setup, 2);
        expect(setup.session.openLevel.history.undoLabel).toBe(undoBefore);
        setup.controller.pick('select');
        setup.controller.pick('shape');
        setup.controller.pointerMove(pointer({ x: 0, y: 0 }));

        expect(setup.tool.drawing?.drawing.rotation).toBe(0);
    });
});
