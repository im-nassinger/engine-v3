import { describe, expect, test } from 'vitest';

import { ShapeComponent, TransformComponent } from '../../../core/components/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import type { SnapResult, Snapper } from '../../snapping/index.ts';

import { buildPointTest } from './testing/pointTest.ts';

const GRID_PX = 50;

// Every point to the nearest multiple of 50 unless Ctrl is held, as the grid snaps.
const GRID_SNAPPING: Snapper = {
    snapMove: (_bounds, offset): SnapResult => ({ point: offset, snappedX: false, snappedY: false }),
    snapPoint: (point, _view, options): SnapResult => {
        if (options.ctrlHeld) return { point, snappedX: false, snappedY: false };

        const snapped = { x: Math.round(point.x / GRID_PX) * GRID_PX, y: Math.round(point.y / GRID_PX) * GRID_PX };

        return { point: snapped, snappedX: true, snappedY: true };
    },
};

// The L's first two points in the level, the ends of its top edge.
const FIRST_POINT = { x: 200, y: 200 };
const SECOND_POINT = { x: 400, y: 200 };
// Inside the L, to double-click it.
const INSIDE_L = { x: 250, y: 250 };

function pointsOf(entity: Entity) {
    const geometry = entity.requireComponent(ShapeComponent).get('geometry');
    if (geometry.kind !== 'polygon' && geometry.kind !== 'line') throw new Error('Not a polygon or line.');

    return geometry.points;
}

function levelPointsOf(entity: Entity, levelMatrixOf: (entity: Entity) => { apply(point: Point): Point }) {
    const matrix = levelMatrixOf(entity);

    return pointsOf(entity).map((point) => matrix.apply(point));
}

describe('SelectTool point edits', () => {
    test('dragging a point moves it as one step, and undo puts it back', () => {
        const { polygon, session, doubleClick, drag } = buildPointTest();
        const before = pointsOf(polygon);
        doubleClick(INSIDE_L);

        drag(FIRST_POINT, { x: 230, y: 190 });

        expect(pointsOf(polygon)[0]).toEqual({ x: -70, y: -110 });
        expect(pointsOf(polygon)[1]).toEqual(before[1]);
        const { history } = session.openLevel;
        expect(history.undoCount).toBe(1);
        expect(history.undoLabel).toBe('Move points of Entity');

        session.openLevel.editor.undo();
        expect(pointsOf(polygon)).toEqual(before);
    });

    test('dragging one of the selected points moves them all; Shift+drag on another adds it', () => {
        const { polygon, tool, click, doubleClick, drag } = buildPointTest();
        doubleClick(INSIDE_L);
        click(FIRST_POINT);
        click(SECOND_POINT, { shift: true });

        drag(SECOND_POINT, { x: 410, y: 220 });
        expect(pointsOf(polygon).slice(0, 2)).toEqual([
            { x: -90, y: -80 },
            { x: 110, y: -80 },
        ]);

        drag({ x: 300, y: 300 }, { x: 300, y: 300 });
        click({ x: 410, y: 220 });
        drag({ x: 400, y: 300 }, { x: 400, y: 310 }, { shift: true });
        expect(tool.editedPoints?.selectedIndexes).toEqual([1, 2]);
        expect(pointsOf(polygon)[2]).toEqual({ x: 100, y: 10 });
    });

    test('the pressed point snaps as a point and the others keep their distance; Ctrl turns snapping off', () => {
        const { polygon, session, click, doubleClick, drag } = buildPointTest(GRID_SNAPPING);
        doubleClick(INSIDE_L);
        click(FIRST_POINT);
        click(SECOND_POINT, { shift: true });

        drag({ x: 201, y: 201 }, { x: 231, y: 241 });
        expect(pointsOf(polygon).slice(0, 2)).toEqual([
            { x: -50, y: -50 },
            { x: 150, y: -50 },
        ]);

        session.openLevel.editor.undo();
        click(FIRST_POINT);
        drag({ x: 201, y: 201 }, { x: 231, y: 241 }, { ctrl: true });
        expect(pointsOf(polygon)[0]).toEqual({ x: -70, y: -60 });
    });

    test('Esc during a drag puts the points back, makes no step and keeps editing', () => {
        const { polygon, session, tool, doubleClick, pointerAt } = buildPointTest();
        const before = pointsOf(polygon);
        doubleClick(INSIDE_L);

        tool.pointerDown(pointerAt(FIRST_POINT));
        tool.pointerMove(pointerAt({ x: 260, y: 260 }));
        expect(tool.readout?.text).toBe('60, 60 px');
        tool.cancel();

        expect(pointsOf(polygon)).toEqual(before);
        expect(session.openLevel.history.undoCount).toBe(0);
        expect(tool.readout).toBeUndefined();
        expect(tool.editedPoints?.selectedIndexes).toEqual([0]);
    });

    test('a point under a rotated, scaled parent follows the mouse on screen', () => {
        const { level, polygon, session, tool, doubleClick, drag } = buildPointTest();
        const group = level.createEntity(level.world, 0);
        group.addComponent(
            new TransformComponent({ position: { x: 100, y: 50 }, rotation: 30, scale: { x: 2, y: 0.5 }, skew: 10 }),
        );
        level.moveEntity(polygon, group, 0);
        polygon.requireComponent(TransformComponent).set('position', { x: 0, y: 0 });
        const levelMatrixOf = (entity: Entity) => session.openLevel.caches.worldMatrices.matrixOf(entity);
        session.openLevel.currentGroup.enter(group);
        session.view.zoomAt({ x: 400, y: 300 }, 0.5);

        const matrix = levelMatrixOf(polygon);
        doubleClick(matrix.apply({ x: -50, y: -50 }));
        expect(tool.editedPoints?.entity).toBe(polygon);

        const start = levelPointsOf(polygon, levelMatrixOf)[0];
        if (start === undefined) throw new Error('The L has a first point.');
        const target = { x: start.x + 37, y: start.y - 21 };
        drag(start, target);

        const moved = levelPointsOf(polygon, levelMatrixOf)[0];
        expect(moved?.x).toBeCloseTo(target.x, 9);
        expect(moved?.y).toBeCloseTo(target.y, 9);
    });

    test('the arrows nudge the selected points 1 px, 10 px with Shift and a grid step with Ctrl+Shift', () => {
        const { level, polygon, click, doubleClick, pressKey } = buildPointTest();
        level.editorData.setGridSize(40);
        doubleClick(INSIDE_L);
        click(FIRST_POINT);

        expect(pressKey('ArrowRight')).toBe(true);
        expect(pressKey('ArrowDown', { shift: true })).toBe(true);
        expect(pressKey('ArrowLeft', { ctrl: true, shift: true })).toBe(true);
        expect(pressKey('ArrowUp', { ctrl: true })).toBe(false);

        expect(pointsOf(polygon)[0]).toEqual({ x: -139, y: -90 });
    });

    test('a run of nudges is one step, and undo puts the points back', () => {
        const { polygon, session, click, doubleClick, pressKey } = buildPointTest();
        const before = pointsOf(polygon);
        doubleClick(INSIDE_L);
        click(FIRST_POINT);

        pressKey('ArrowRight');
        pressKey('ArrowRight');
        pressKey('ArrowDown');

        const { history } = session.openLevel;
        expect(history.undoCount).toBe(1);
        expect(history.undoLabel).toBe('Move points of Entity');
        session.openLevel.editor.undo();
        expect(pointsOf(polygon)).toEqual(before);
    });

    test('with no point selected the arrows and Delete are taken but change nothing', () => {
        const { polygon, session, doubleClick, pressKey } = buildPointTest();
        const before = pointsOf(polygon);
        doubleClick(INSIDE_L);

        expect(pressKey('ArrowRight')).toBe(true);
        expect(pressKey('Delete')).toBe(true);

        expect(pointsOf(polygon)).toEqual(before);
        expect(session.openLevel.level.findEntity(polygon.id)).toBe(polygon);
        expect(session.openLevel.history.undoCount).toBe(0);
    });

    test('outside point editing the Select tool leaves the keys to the commands', () => {
        const { click, pressKey } = buildPointTest();
        click(INSIDE_L);

        expect(pressKey('ArrowRight')).toBe(false);
        expect(pressKey('Delete')).toBe(false);
    });

    test('a double-click on an edge adds a point there and selects it, one step', () => {
        const { polygon, session, tool, doubleClick } = buildPointTest();
        const before = pointsOf(polygon);
        doubleClick(INSIDE_L);

        doubleClick({ x: 300, y: 202 });

        const points = pointsOf(polygon);
        expect(points).toHaveLength(7);
        expect(points[1]).toEqual({ x: 0, y: -100 });
        expect(tool.editedPoints?.selectedIndexes).toEqual([1]);
        const { history } = session.openLevel;
        expect(history.undoCount).toBe(1);
        expect(history.undoLabel).toBe('Add a point to Entity');

        session.openLevel.editor.undo();
        expect(pointsOf(polygon)).toEqual(before);
        expect(tool.editedPoints?.selectedIndexes).toEqual([]);
    });

    test("a double-click on a line's edge adds a point between its two", () => {
        const { line, doubleClick } = buildPointTest();
        doubleClick({ x: 650, y: 300 });

        doubleClick({ x: 620, y: 301 });

        expect(pointsOf(line)).toEqual([
            { x: -50, y: 0 },
            { x: -30, y: 0 },
            { x: 50, y: 0 },
        ]);
    });

    test('Delete and Backspace delete the selected points as one step, and undo puts them back', () => {
        const { polygon, session, tool, click, doubleClick, pressKey } = buildPointTest();
        const before = pointsOf(polygon);
        doubleClick(INSIDE_L);
        click(FIRST_POINT);
        click(SECOND_POINT, { shift: true });

        expect(pressKey('Delete')).toBe(true);
        expect(pointsOf(polygon)).toEqual(before.slice(2));
        expect(tool.editedPoints?.selectedIndexes).toEqual([]);

        click({ x: 300, y: 300 });
        pressKey('Backspace');
        expect(pointsOf(polygon)).toHaveLength(3);

        const { history } = session.openLevel;
        expect(history.undoLabel).toBe('Delete points of Entity');
        session.openLevel.editor.undo();
        session.openLevel.editor.undo();
        expect(pointsOf(polygon)).toEqual(before);
    });

    test('a polygon keeps at least 3 points and a line 2, with a status text', () => {
        const { polygon, line, session, tool, doubleClick, pressKey, drag } = buildPointTest();
        doubleClick(INSIDE_L);
        drag({ x: 150, y: 150 }, { x: 450, y: 450 });
        expect(tool.editedPoints?.selectedIndexes).toHaveLength(6);

        pressKey('Delete');
        expect(pointsOf(polygon)).toHaveLength(6);
        expect(session.status.current).toBe('A polygon keeps at least 3 points');

        tool.cancel();
        doubleClick({ x: 650, y: 300 });
        drag({ x: 580, y: 250 }, { x: 720, y: 350 });
        pressKey('Backspace');
        expect(pointsOf(line)).toHaveLength(2);
        expect(session.status.current).toBe('A line keeps at least 2 points');
        expect(session.openLevel.history.undoCount).toBe(0);
    });
});
