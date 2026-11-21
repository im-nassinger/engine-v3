import { describe, expect, test } from 'vitest';

import {
    JointComponent,
    NameComponent,
    PathComponent,
    StyleComponent,
    TransformComponent,
} from '../../../core/components/index.ts';
import { curveBetween, pointOnCubic, smoothHandles } from '../../../core/geometry/index.ts';
import type { PathGeometry, PathPoint, Point } from '../../../core/geometry/index.ts';
import type { Entity, Level } from '../../../core/level/index.ts';

import { buildPointTest } from './testing/pointTest.ts';

function sharp(x: number, y: number): PathPoint {
    return { x, y, handleIn: null, handleOut: null, corner: 'sharp' };
}

// At 600, 500: a sharp end at 500, 500, a smooth point at 600, 500 whose handles curve both its segments,
// and a sharp end at 700, 500.
const SMOOTH_MIDDLE: PathPoint = {
    x: 0,
    y: 0,
    handleIn: { x: -30, y: -30 },
    handleOut: { x: 30, y: 30 },
    corner: 'smooth',
};
const OPEN_PATH: PathGeometry = { closed: false, points: [sharp(-100, 0), SMOOTH_MIDDLE, sharp(100, 0)] };
const PATH_POSITION = { x: 600, y: 500 };
const FIRST_POINT = { x: 500, y: 500 };
const MIDDLE_POINT = { x: 600, y: 500 };
const LAST_POINT = { x: 700, y: 500 };

function addPath(level: Level, path: PathGeometry = OPEN_PATH, position: Point = PATH_POSITION) {
    const entity = level.createEntity(level.world, 0);
    entity.addComponent(new TransformComponent({ position, rotation: 0, scale: { x: 1, y: 1 }, skew: 0 }));
    entity.addComponent(new NameComponent({ name: 'Path 1' }));
    entity.addComponent(new PathComponent({ path }));
    entity.addComponent(new StyleComponent());

    return entity;
}

function buildPathTest(path: PathGeometry = OPEN_PATH) {
    const setup = buildPointTest();
    const entity = addPath(setup.level, path);

    return { ...setup, path: entity };
}

function storedPath(entity: Entity) {
    return entity.requireComponent(PathComponent).get('path');
}

// A place on the path's segment from point `startIndex`, in level positions.
function onSegment(entity: Entity, startIndex: number, share: number) {
    const { points } = storedPath(entity);
    const from = points[startIndex];
    const to = points[(startIndex + 1) % points.length];
    if (from === undefined || to === undefined) throw new Error('No such segment.');

    const own = pointOnCubic(curveBetween(from, to), share);
    const position = entity.requireComponent(TransformComponent).get('position');

    return { x: own.x + position.x, y: own.y + position.y };
}

// The places the path draws, its curves sampled finely, in its own space.
function drawnPlaces(path: PathGeometry) {
    const places: Point[] = [];
    const { points } = path;
    const edgeCount = path.closed ? points.length : points.length - 1;

    for (let index = 0; index < edgeCount; index++) {
        const from = points[index] as PathPoint;
        const to = points[(index + 1) % points.length] as PathPoint;
        for (let step = 0; step <= 200; step++) {
            places.push(pointOnCubic(curveBetween(from, to), step / 200));
        }
    }

    return places;
}

// How far the farthest of the places is from the nearest of the others.
function farthestFrom(places: readonly Point[], others: readonly Point[]) {
    return Math.max(
        ...places.map((place) => Math.min(...others.map((other) => Math.hypot(other.x - place.x, other.y - place.y)))),
    );
}

describe('SelectTool point editing on a path', () => {
    test('a double-click on a path enters point editing, with its corners shown', () => {
        const { path, tool, doubleClick } = buildPathTest();

        doubleClick(onSegment(path, 0, 0.5));

        expect(tool.editedPoints?.entity).toBe(path);
        expect(tool.editedPoints?.corners()).toEqual(['sharp', 'smooth', 'sharp']);
        expect(tool.editedPoints?.levelPoints()).toEqual([FIRST_POINT, MIDDLE_POINT, LAST_POINT]);
    });

    test("a double-click on a Rope's or Spring's path only selects it", () => {
        const { path, square, session, tool, doubleClick } = buildPathTest();
        path.addComponent(new JointComponent({ ...JointComponent.schema.defaults(), a: square.id }));

        // A joint is hit by its icon, at its position.
        doubleClick(PATH_POSITION);

        expect(session.openLevel.selection.entities).toEqual([path]);
        expect(tool.editedPoints).toBeUndefined();
    });

    test('dragging a point moves it with its handles, as one step', () => {
        const { path, session, doubleClick, drag } = buildPathTest();
        doubleClick(onSegment(path, 0, 0.5));

        drag(MIDDLE_POINT, { x: 620, y: 470 });

        expect(storedPath(path).points[1]).toEqual({ ...SMOOTH_MIDDLE, x: 20, y: -30 });
        expect(session.openLevel.history.undoLabel).toBe('Move points of Path 1');
        session.openLevel.editor.undo();
        expect(storedPath(path)).toEqual(OPEN_PATH);
    });

    test('the arrows nudge the selected points with their handles', () => {
        const { path, click, doubleClick, pressKey } = buildPathTest();
        doubleClick(onSegment(path, 0, 0.5));
        click(MIDDLE_POINT);

        expect(pressKey('ArrowRight', { shift: true })).toBe(true);

        expect(storedPath(path).points[1]).toEqual({ ...SMOOTH_MIDDLE, x: 10 });
    });

    test("deleting stops at an open path's 2 points, and the new end drops its outer handle", () => {
        const { path, session, tool, click, doubleClick, pressKey } = buildPathTest();
        doubleClick(onSegment(path, 0, 0.5));
        click(FIRST_POINT);

        pressKey('Delete');

        expect(storedPath(path).points).toEqual([{ ...SMOOTH_MIDDLE, handleIn: null }, sharp(100, 0)]);
        expect(session.openLevel.history.undoLabel).toBe('Delete points of Path 1');
        expect(tool.editedPoints?.selectedIndexes).toEqual([]);

        click(LAST_POINT);
        pressKey('Delete');
        expect(storedPath(path).points).toHaveLength(2);
        expect(session.status.current).toBe('A path keeps at least 2 points');
    });

    test("deleting stops at a closed path's 3 points", () => {
        const triangle: PathGeometry = { closed: true, points: [sharp(-100, 0), sharp(0, -100), sharp(100, 0)] };
        const { path, session, click, doubleClick, pressKey } = buildPathTest(triangle);
        doubleClick({ x: 600, y: 500 });
        click(FIRST_POINT);

        pressKey('Backspace');

        expect(storedPath(path)).toEqual(triangle);
        expect(session.status.current).toBe('A closed path keeps at least 3 points');
    });

    test("a double-click on a curve adds a smooth point through splitCurve, and the path's look doesn't change", () => {
        const { path, session, tool, doubleClick } = buildPathTest();
        doubleClick(onSegment(path, 0, 0.5));
        const before = storedPath(path);

        doubleClick(onSegment(path, 0, 0.4));

        const after = storedPath(path);
        expect(after.points).toHaveLength(4);
        expect(after.points[1]?.corner).toBe('smooth');
        expect(after.points[0]).toEqual(sharp(-100, 0));
        expect(after.points[2]?.handleOut).toEqual(SMOOTH_MIDDLE.handleOut);
        expect(Math.hypot(after.points[2]?.handleIn?.x ?? 0, after.points[2]?.handleIn?.y ?? 0)).toBeLessThan(
            Math.hypot(30, 30),
        );
        expect(farthestFrom(drawnPlaces(after), drawnPlaces(before))).toBeLessThan(0.5);
        expect(farthestFrom(drawnPlaces(before), drawnPlaces(after))).toBeLessThan(0.5);
        expect(tool.editedPoints?.selectedIndexes).toEqual([1]);
        expect(session.openLevel.history.undoLabel).toBe('Add a point to Path 1');
    });

    test('a double-click on a straight segment adds a sharp point', () => {
        const straight: PathGeometry = { closed: false, points: [sharp(-100, 0), sharp(100, 0)] };
        const { path, doubleClick } = buildPathTest(straight);
        doubleClick({ x: 600, y: 500 });

        doubleClick({ x: 650, y: 502 });

        expect(storedPath(path).points).toEqual([sharp(-100, 0), sharp(50, 0), sharp(100, 0)]);
    });

    test('a double-click on a point switches it between sharp and smooth, one step each', () => {
        const corner: PathGeometry = { closed: false, points: [sharp(-100, 0), sharp(0, -60), sharp(100, 0)] };
        const { path, session, tool, doubleClick } = buildPathTest(corner);
        doubleClick(onSegment(path, 0, 0.5));

        doubleClick({ x: 600, y: 440 });

        const smooth = storedPath(path).points[1];
        expect(smooth).toEqual({ ...sharp(0, -60), ...smoothHandles(corner, 1), corner: 'smooth' });
        expect(session.openLevel.history.undoLabel).toBe('Change a point of Path 1');
        expect(tool.editedPoints?.corners()).toEqual(['sharp', 'smooth', 'sharp']);
        expect(tool.editedPoints?.selectedIndexes).toEqual([1]);

        doubleClick({ x: 600, y: 440 });

        expect(storedPath(path)).toEqual(corner);
        expect(session.openLevel.history.undoCount).toBe(2);
    });

    test('a separate point double-clicked becomes sharp', () => {
        const separate: PathPoint = { ...SMOOTH_MIDDLE, handleOut: { x: 50, y: 0 }, corner: 'separate' };
        const { path, doubleClick } = buildPathTest({
            closed: false,
            points: [sharp(-100, 0), separate, sharp(100, 0)],
        });
        doubleClick(onSegment(path, 0, 0.5));

        doubleClick(MIDDLE_POINT);

        expect(storedPath(path).points[1]).toEqual(sharp(0, 0));
    });
});
