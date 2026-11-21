import { describe, expect, test } from 'vitest';

import { JointComponent, NameComponent, PathComponent, TransformComponent } from '../../../core/components/index.ts';
import type { PathPoint, Point } from '../../../core/geometry/index.ts';
import type { Entity } from '../../../core/level/index.ts';

import { BACKSPACE, ENTER, buildPenTest, click, drag, pointer } from './testing/penToolTest.ts';
import type { PenSetup } from './testing/penToolTest.ts';

function sharp(x: number, y: number): PathPoint {
    return { x, y, handleIn: null, handleOut: null, corner: 'sharp' };
}

// An open path at 100, 100 through 0, 0 and 100, 0 of its own space: its ends at 100, 100 and 200, 100.
const OWN_POINTS = [sharp(0, 0), sharp(100, 0)];
const FIRST_END = { x: 100, y: 100 };
const LAST_END = { x: 200, y: 100 };

function addPath(setup: PenSetup, parent: Entity, points: readonly PathPoint[] = OWN_POINTS) {
    const path = setup.level.createEntity(parent, 0);
    path.addComponent(
        new TransformComponent({ position: { x: 100, y: 100 }, rotation: 0, scale: { x: 1, y: 1 }, skew: 0 }),
    );
    path.addComponent(new NameComponent({ name: 'Path 1' }));
    path.addComponent(new PathComponent({ path: { closed: false, points } }));

    return path;
}

// The pen picked with the path selected.
function buildWithPath(points: readonly PathPoint[] = OWN_POINTS) {
    const setup = buildPenTest();
    setup.controller.pick('select');
    const path = addPath(setup, setup.level.world, points);
    setup.session.openLevel.selection.replace([path.id]);
    setup.controller.pick('pen');

    return { setup, path };
}

function storedPoints(path: Entity) {
    return path.requireComponent(PathComponent).get('path').points;
}

function placesOf(points: readonly PathPoint[]) {
    return points.map((point) => ({ x: point.x, y: point.y }));
}

function isClosed(path: Entity) {
    return path.requireComponent(PathComponent).get('path').closed;
}

function hover(setup: PenSetup, at: Point) {
    setup.controller.pointerMove(pointer(at));
}

describe('PenTool continuing an open path', () => {
    test('picking the pen with one open path selected keeps it and rings its two ends', () => {
        const { setup, path } = buildWithPath();

        hover(setup, { x: 400, y: 400 });

        expect(setup.session.openLevel.selection.ids).toEqual([path.id]);
        expect(setup.pen.penDrawing?.ends).toEqual([
            { place: FIRST_END, underMouse: false },
            { place: LAST_END, underMouse: false },
        ]);
    });

    test('the end under the mouse is marked, and no next point shows there', () => {
        const { setup } = buildWithPath();

        hover(setup, { x: 203, y: 102 });

        expect(setup.pen.penDrawing?.ends.map((end) => end.underMouse)).toEqual([false, true]);
        expect(setup.pen.penDrawing?.next).toBeUndefined();
    });

    test('from the last end: the new points go after its own, one step Draw on Path 1, back to Select', () => {
        const { setup, path } = buildWithPath();

        click(setup, LAST_END);
        click(setup, { x: 200, y: 200 });
        click(setup, { x: 300, y: 200 });
        expect(setup.session.openLevel.history.undoCount).toBe(0);
        setup.controller.keyDown(ENTER);

        expect(placesOf(storedPoints(path))).toEqual([
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 100 },
            { x: 200, y: 100 },
        ]);
        expect(isClosed(path)).toBe(false);
        expect(setup.session.openLevel.history.undoCount).toBe(1);
        expect(setup.session.openLevel.history.undoLabel).toBe('Draw on Path 1');
        expect(setup.session.openLevel.selection.ids).toEqual([path.id]);
        expect(setup.controller.active.id).toBe('select');
        expect(setup.level.world.children).toHaveLength(3);
    });

    test('from the first end: the new points go before its own, in the order drawn back from it', () => {
        const { setup, path } = buildWithPath();

        click(setup, FIRST_END);
        click(setup, { x: 100, y: 200 });
        click(setup, { x: 0, y: 200 });
        setup.controller.keyDown(ENTER);

        expect(placesOf(storedPoints(path))).toEqual([
            { x: -100, y: 100 },
            { x: 0, y: 100 },
            { x: 0, y: 0 },
            { x: 100, y: 0 },
        ]);
    });

    test('a curve drawn from the first end keeps its look when reversed back', () => {
        const { setup, path } = buildWithPath();

        click(setup, FIRST_END);
        drag(setup, { x: 100, y: 200 }, { x: 150, y: 200 });
        setup.controller.keyDown(ENTER);

        expect(storedPoints(path)).toEqual([
            { x: 0, y: 100, handleIn: null, handleOut: { x: -50, y: 0 }, corner: 'smooth' },
            ...OWN_POINTS,
        ]);
    });

    test('drawn from the last end and closed on the first, the path closes with its own first point first', () => {
        const { setup, path } = buildWithPath();

        click(setup, LAST_END);
        click(setup, { x: 150, y: 200 });
        hover(setup, FIRST_END);
        expect(setup.pen.penDrawing?.closing).toBe(true);
        click(setup, FIRST_END);

        expect(isClosed(path)).toBe(true);
        expect(placesOf(storedPoints(path))).toEqual([
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 50, y: 100 },
        ]);
        expect(setup.session.openLevel.history.undoLabel).toBe('Draw on Path 1');
        expect(setup.controller.active.id).toBe('select');
    });

    test('drawn from the first end and closed on the last, the path keeps its own first point first', () => {
        const { setup, path } = buildWithPath();

        click(setup, FIRST_END);
        click(setup, { x: 50, y: 200 });
        click(setup, { x: 250, y: 200 });
        click(setup, LAST_END);

        expect(isClosed(path)).toBe(true);
        expect(placesOf(storedPoints(path))).toEqual([
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 150, y: 100 },
            { x: -50, y: 100 },
        ]);
    });

    test('Ctrl+Z and Backspace stop at the path’s own points', () => {
        const { setup, path } = buildWithPath();

        click(setup, LAST_END);
        click(setup, { x: 200, y: 200 });
        expect(setup.controller.undoDrawingStep()).toBe(true);
        expect(setup.controller.undoDrawingStep()).toBe(true);
        expect(setup.controller.keyDown(BACKSPACE)).toBe(true);
        expect(setup.pen.penDrawing?.points).toHaveLength(2);
        setup.controller.keyDown(ENTER);

        expect(placesOf(storedPoints(path))).toEqual(placesOf(OWN_POINTS));
        expect(setup.session.openLevel.history.undoCount).toBe(0);
    });

    test('Esc keeps what was added, stays on the pen, and rings the ends again', () => {
        const { setup, path } = buildWithPath();

        click(setup, LAST_END);
        click(setup, { x: 200, y: 200 });
        setup.controller.cancelDrawing();

        expect(storedPoints(path)).toHaveLength(3);
        expect(setup.controller.active.id).toBe('pen');
        expect(setup.pen.penDrawing?.ends.map((end) => end.place)).toEqual([FIRST_END, { x: 200, y: 200 }]);
    });

    test('Undo after continuing puts the path back', () => {
        const { setup, path } = buildWithPath();

        click(setup, LAST_END);
        click(setup, { x: 200, y: 200 });
        setup.controller.keyDown(ENTER);
        setup.session.openLevel.editor.undo();

        expect(placesOf(storedPoints(path))).toEqual(placesOf(OWN_POINTS));
    });

    test('a press away from the ends lets the path go and starts a new one', () => {
        const { setup, path } = buildWithPath();

        click(setup, { x: 400, y: 400 });
        click(setup, { x: 500, y: 400 });
        setup.controller.keyDown(ENTER);

        expect(storedPoints(path)).toHaveLength(2);
        expect(setup.level.world.children).toHaveLength(4);
        expect(setup.session.openLevel.history.undoLabel).toBe('Draw Path 2');
    });

    test("a Rope's or Spring's path is refused: the selection clears and no end is ringed", () => {
        const setup = buildPenTest();
        setup.controller.pick('select');
        const rope = addPath(setup, setup.level.world);
        rope.addComponent(new JointComponent({ ...JointComponent.schema.defaults(), a: setup.square.id }));
        setup.session.openLevel.selection.replace([rope.id]);

        setup.controller.pick('pen');
        hover(setup, LAST_END);

        expect(setup.session.openLevel.selection.isEmpty).toBe(true);
        expect(setup.pen.penDrawing?.ends).toEqual([]);
    });

    test('a path in a locked group is refused', () => {
        const setup = buildPenTest();
        setup.controller.pick('select');
        const path = addPath(setup, setup.group);
        setup.session.openLevel.currentGroup.enter(setup.group);
        setup.session.openLevel.selection.replace([path.id]);
        setup.group.setLocked(true);

        setup.controller.pick('pen');

        expect(setup.session.openLevel.selection.isEmpty).toBe(true);
    });

    test('a closed path, or two entities, are not kept', () => {
        const setup = buildPenTest();
        setup.controller.pick('select');
        const path = addPath(setup, setup.level.world);
        setup.session.openLevel.selection.replace([path.id, setup.group.id]);
        setup.controller.pick('pen');
        expect(setup.session.openLevel.selection.isEmpty).toBe(true);

        setup.controller.pick('select');
        const triangle = { closed: true, points: [sharp(0, 0), sharp(100, 0), sharp(0, 100)] };
        path.requireComponent(PathComponent).set('path', triangle);
        setup.session.openLevel.selection.replace([path.id]);
        setup.controller.pick('pen');
        expect(setup.session.openLevel.selection.isEmpty).toBe(true);
    });
});
