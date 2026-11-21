import { describe, expect, test } from 'vitest';

import { NameComponent, PathComponent, StyleComponent, TransformComponent } from '../../../core/components/index.ts';
import type { PathGeometry, PathPoint, Point } from '../../../core/geometry/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import type { SnapResult, Snapper } from '../../snapping/index.ts';

import { buildPointTest, NO_SNAPPING } from './testing/pointTest.ts';

function sharp(x: number, y: number): PathPoint {
    return { x, y, handleIn: null, handleOut: null, corner: 'sharp' };
}

// At 600, 500: a sharp end at 500, 500, a smooth point at 600, 500 with its handles' ends at 570, 470
// and 630, 530, and a sharp end at 700, 500.
const SMOOTH_MIDDLE: PathPoint = {
    x: 0,
    y: 0,
    handleIn: { x: -30, y: -30 },
    handleOut: { x: 30, y: 30 },
    corner: 'smooth',
};
const MIDDLE_POINT = { x: 600, y: 500 };
const HANDLE_IN_END = { x: 570, y: 470 };
const HANDLE_OUT_END = { x: 630, y: 530 };

function pathWith(middle: PathPoint): PathGeometry {
    return { closed: false, points: [sharp(-100, 0), middle, sharp(100, 0)] };
}

// Snaps a point to a 50 px grid unless Ctrl is held.
const GRID_SNAPPING: Snapper = {
    ...NO_SNAPPING,
    snapPoint: (point, _view, options): SnapResult => {
        if (options.ctrlHeld) return { point, snappedX: false, snappedY: false };

        const snapped = { x: Math.round(point.x / 50) * 50, y: Math.round(point.y / 50) * 50 };

        return { point: snapped, snappedX: true, snappedY: true };
    },
};

// Point editing on the path, with its middle point selected.
function buildHandleTest(middle: PathPoint = SMOOTH_MIDDLE, snapper: Snapper = NO_SNAPPING) {
    const setup = buildPointTest(snapper);
    const path = setup.level.createEntity(setup.level.world, 0);
    const position = { x: 600, y: 500 };
    path.addComponent(new TransformComponent({ position, rotation: 0, scale: { x: 1, y: 1 }, skew: 0 }));
    path.addComponent(new NameComponent({ name: 'Path 1' }));
    path.addComponent(new PathComponent({ path: pathWith(middle) }));
    path.addComponent(new StyleComponent());

    // On the path's first point, which every middle point leaves where it is.
    setup.doubleClick({ x: 500, y: 500 });
    setup.click(MIDDLE_POINT);

    return { ...setup, path };
}

function middleOf(path: Entity) {
    return path.requireComponent(PathComponent).get('path').points[1];
}

function expectHandleNear(handle: Point | null | undefined, expected: Point) {
    expect(handle?.x).toBeCloseTo(expected.x);
    expect(handle?.y).toBeCloseTo(expected.y);
}

describe('SelectTool point editing: curve handles', () => {
    test("the selected points' handles show, in level positions", () => {
        const { tool } = buildHandleTest();

        const handles = tool.editedPoints?.selectedHandles();

        expect(handles).toEqual([
            { index: 1, side: 'handleIn', from: MIDDLE_POINT, to: HANDLE_IN_END },
            { index: 1, side: 'handleOut', from: MIDDLE_POINT, to: HANDLE_OUT_END },
        ]);
    });

    test('a sharp point has no handles to show', () => {
        const { tool, click } = buildHandleTest();
        click({ x: 500, y: 500 });

        expect(tool.editedPoints?.selectedHandles()).toEqual([]);
    });

    test('dragging a smooth point’s handle turns the other opposite, keeping its length, as one step', () => {
        const { path, session, drag } = buildHandleTest();

        drag(HANDLE_OUT_END, { x: 660, y: 500 });

        const middle = middleOf(path);
        expect(middle?.handleOut).toEqual({ x: 60, y: 0 });
        expectHandleNear(middle?.handleIn, { x: -30 * Math.SQRT2, y: 0 });
        expect(middle?.corner).toBe('smooth');
        expect(middle?.x).toBe(0);
        expect(session.openLevel.history.undoLabel).toBe('Move a handle of Path 1');

        session.openLevel.editor.undo();
        expect(middleOf(path)).toEqual(SMOOTH_MIDDLE);
    });

    test('the handle in drags too, turning the handle out', () => {
        const { path, drag } = buildHandleTest();

        drag(HANDLE_IN_END, { x: 600, y: 440 });

        expect(middleOf(path)?.handleIn).toEqual({ x: 0, y: -60 });
        expectHandleNear(middleOf(path)?.handleOut, { x: 0, y: 30 * Math.SQRT2 });
    });

    test('Alt during the drag makes the point separate and moves the handle alone', () => {
        const { path, tool, pointerAt } = buildHandleTest();

        tool.pointerDown(pointerAt(HANDLE_OUT_END));
        tool.pointerMove(pointerAt({ x: 650, y: 520 }, { alt: true }));
        tool.pointerMove(pointerAt({ x: 660, y: 500 }));
        tool.pointerUp(pointerAt({ x: 660, y: 500 }));

        expect(middleOf(path)).toEqual({ ...SMOOTH_MIDDLE, handleOut: { x: 60, y: 0 }, corner: 'separate' });
    });

    test("a separate point's handle moves alone", () => {
        const { path, drag } = buildHandleTest({ ...SMOOTH_MIDDLE, corner: 'separate' });

        drag(HANDLE_OUT_END, { x: 660, y: 500 });

        expect(middleOf(path)).toEqual({ ...SMOOTH_MIDDLE, handleOut: { x: 60, y: 0 }, corner: 'separate' });
    });

    test('Shift keeps the handle to a multiple of 15°, its length kept', () => {
        const { path, drag } = buildHandleTest();

        drag(HANDLE_OUT_END, { x: 650, y: 512 }, { shift: true });

        const length = Math.hypot(50, 12);
        const angle = (15 * Math.PI) / 180;
        expectHandleNear(middleOf(path)?.handleOut, { x: length * Math.cos(angle), y: length * Math.sin(angle) });
    });

    test("the handle's end snaps as a point, and Ctrl turns that off", () => {
        const snapped = buildHandleTest(SMOOTH_MIDDLE, GRID_SNAPPING);
        snapped.drag(HANDLE_OUT_END, { x: 653, y: 497 });
        expect(middleOf(snapped.path)?.handleOut).toEqual({ x: 50, y: 0 });

        const free = buildHandleTest(SMOOTH_MIDDLE, GRID_SNAPPING);
        free.drag(HANDLE_OUT_END, { x: 653, y: 497 }, { ctrl: true });
        expect(middleOf(free.path)?.handleOut).toEqual({ x: 53, y: -3 });
    });

    test('the press keeps its distance from the handle’s end', () => {
        const { path, drag } = buildHandleTest();

        drag({ x: 632, y: 531 }, { x: 662, y: 501 });

        expect(middleOf(path)?.handleOut).toEqual({ x: 60, y: 0 });
    });

    test('Esc puts the handle back and makes no step', () => {
        const { path, session, tool, pointerAt } = buildHandleTest();
        const undoLabel = session.openLevel.history.undoLabel;

        tool.pointerDown(pointerAt(HANDLE_OUT_END));
        tool.pointerMove(pointerAt({ x: 660, y: 500 }));
        expect(tool.cancel()).toBe(true);

        expect(middleOf(path)).toEqual(SMOOTH_MIDDLE);
        expect(session.openLevel.history.undoLabel).toBe(undoLabel);
        expect(tool.editedPoints?.selectedIndexes).toEqual([1]);
    });

    test('a click on a handle changes nothing and keeps the point selected', () => {
        const { path, session, tool, click } = buildHandleTest();
        const undoLabel = session.openLevel.history.undoLabel;

        click(HANDLE_OUT_END);

        expect(middleOf(path)).toEqual(SMOOTH_MIDDLE);
        expect(session.openLevel.history.undoLabel).toBe(undoLabel);
        expect(tool.editedPoints?.selectedIndexes).toEqual([1]);
    });

    test('a handle is hit before a point under it', () => {
        // The handle out's end sits on the last point.
        const reaching: PathPoint = { ...SMOOTH_MIDDLE, handleIn: { x: -30, y: 0 }, handleOut: { x: 100, y: 0 } };
        const { path, drag } = buildHandleTest(reaching);

        drag({ x: 700, y: 500 }, { x: 680, y: 520 });

        expect(middleOf(path)?.handleOut).toEqual({ x: 80, y: 20 });
        expect(path.requireComponent(PathComponent).get('path').points[2]).toEqual(sharp(100, 0));
    });

    test("an unselected point's handles aren't hit", () => {
        const { path, tool, click, drag } = buildHandleTest();
        click({ x: 500, y: 500 });

        drag(HANDLE_OUT_END, { x: 660, y: 500 });

        expect(middleOf(path)).toEqual(SMOOTH_MIDDLE);
        expect(tool.editedPoints?.isEditable).toBe(true);
    });
});
