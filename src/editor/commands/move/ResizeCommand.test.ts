import { describe, expect, test } from 'vitest';

import { ShapeComponent, StyleComponent, TransformComponent } from '../../../core/components/index.ts';
import type { Point, ShapeGeometry } from '../../../core/geometry/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { Level } from '../../../core/level/index.ts';
import { EditorSession } from '../../session/index.ts';
import { outcomeText } from '../../status/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { createCommandRegistry } from '../createCommandRegistry.ts';

const RECTANGLE: ShapeGeometry = { kind: 'rectangle', width: 100, height: 40 };
const CIRCLE: ShapeGeometry = { kind: 'circle', radius: 20 };
// A triangle whose own origin is a corner, so its bounds' centre, 50, 25, is not its origin.
const TRIANGLE: ShapeGeometry = {
    kind: 'polygon',
    points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 50, y: 50 },
    ],
};
const FLAT_LINE: ShapeGeometry = {
    kind: 'line',
    points: [
        { x: -50, y: 0 },
        { x: 50, y: 0 },
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

function buildResizeTest() {
    const level = Level.createNew();
    const rectangle = addShape(level, level.world, { x: 100, y: 100 }, RECTANGLE);
    const turned = addShape(level, level.world, { x: 300, y: 100 }, RECTANGLE);
    turned.requireComponent(TransformComponent).set('rotation', 90);
    const circle = addShape(level, level.world, { x: 500, y: 100 }, CIRCLE);
    const triangle = addShape(level, level.world, { x: 700, y: 100 }, TRIANGLE);
    const line = addShape(level, level.world, { x: 900, y: 100 }, FLAT_LINE);
    const group = level.createEntity(level.world, 0);
    group.addComponent(new TransformComponent());

    const timer = new ManualTimer();
    const session = new EditorSession({ level, clock: timer.clock, timer, frames: new ManualFrames() });
    const commands = createCommandRegistry(session);
    const run = (id: string) => {
        const command = commands.find(id);
        if (command === undefined) throw new Error(`No command ${id}.`);

        return command.run();
    };
    const { selection, history, editor } = session.openLevel;

    return {
        level,
        rectangle,
        turned,
        circle,
        triangle,
        line,
        group,
        timer,
        commands,
        run,
        selection,
        history,
        editor,
    };
}

function geometryOf(entity: Entity) {
    return entity.requireComponent(ShapeComponent).get('geometry');
}

function positionOf(entity: Entity) {
    return entity.requireComponent(TransformComponent).get('position');
}

describe('the resize commands', () => {
    test('are W, A, S and D, Shift for 10 px, with no menu entry, repeating while held', () => {
        const { commands } = buildResizeTest();
        const resizes = commands.all.filter((command) => command.id.startsWith('edit.resize'));

        expect(resizes.map((command) => command.shortcuts[0])).toEqual([
            'D',
            'Shift+D',
            'A',
            'Shift+A',
            'W',
            'Shift+W',
            'S',
            'Shift+S',
        ]);
        expect(resizes.every((command) => command.menu === undefined)).toBe(true);
        expect(resizes.every((command) => command.repeatsWhileHeld === true)).toBe(true);
        expect(commands.find('edit.resizeShorter10')?.label).toBe('Resize shorter 10 px');
    });

    test("change a rectangle's width and height, never its TransformComponent", () => {
        const { rectangle, selection, run } = buildResizeTest();
        selection.replace([rectangle.id]);

        run('edit.resizeWider10');
        run('edit.resizeNarrower1');
        run('edit.resizeTaller1');
        run('edit.resizeShorter10');

        expect(geometryOf(rectangle)).toEqual({ kind: 'rectangle', width: 109, height: 31 });
        expect(positionOf(rectangle)).toEqual({ x: 100, y: 100 });
        expect(rectangle.requireComponent(TransformComponent).get('scale')).toEqual({ x: 1, y: 1 });
    });

    test('grow a rotated rectangle along its own width', () => {
        const { turned, selection, run } = buildResizeTest();
        selection.replace([turned.id]);

        run('edit.resizeWider10');

        expect(geometryOf(turned)).toEqual({ kind: 'rectangle', width: 110, height: 40 });
        expect(turned.requireComponent(TransformComponent).get('rotation')).toBe(90);
    });

    test('change a circle by half a step on either axis', () => {
        const { circle, selection, run } = buildResizeTest();
        selection.replace([circle.id]);

        run('edit.resizeWider10');
        run('edit.resizeTaller1');
        run('edit.resizeShorter1');
        run('edit.resizeNarrower1');

        expect(geometryOf(circle)).toEqual({ kind: 'circle', radius: 24.5 });
    });

    test("spread a polygon's points from its bounds' centre", () => {
        const { triangle, selection, run } = buildResizeTest();
        selection.replace([triangle.id]);

        run('edit.resizeWider10');
        run('edit.resizeShorter10');

        expect(geometryOf(triangle)).toEqual({
            kind: 'polygon',
            points: [
                { x: -5, y: 5 },
                { x: 105, y: 5 },
                { x: 50, y: 45 },
            ],
        });
        expect(positionOf(triangle)).toEqual({ x: 700, y: 100 });
    });

    test('lengthen a flat line, and leave its thin side alone', () => {
        const { line, selection, run } = buildResizeTest();
        selection.replace([line.id]);

        run('edit.resizeWider10');
        const outcome = run('edit.resizeTaller1');

        expect(geometryOf(line)).toEqual({
            kind: 'line',
            points: [
                { x: -55, y: 0 },
                { x: 55, y: 0 },
            ],
        });
        expect(outcome).toEqual({ kind: 'refused', reason: 'Nothing here grows that way' });
    });

    test('stop at the smallest size, and then change nothing', () => {
        const { rectangle, circle, selection, run, history } = buildResizeTest();
        selection.replace([rectangle.id, circle.id]);

        for (let press = 0; press < 5; press++) {
            run('edit.resizeShorter10');
        }
        const stepsBefore = history.undoCount;
        const outcome = run('edit.resizeShorter1');

        expect(geometryOf(rectangle)).toEqual({ kind: 'rectangle', width: 100, height: 1 });
        expect(geometryOf(circle)).toEqual({ kind: 'circle', radius: 0.5 });
        expect(outcome).toEqual({ kind: 'refused', reason: 'Already at its smallest' });
        expect(history.undoCount).toBe(stepsBefore);
    });

    test('make one Resize step of a run of presses within 1 s, undone and redone whole', () => {
        const { rectangle, selection, run, history, timer, editor } = buildResizeTest();
        selection.replace([rectangle.id]);

        run('edit.resizeWider1');
        timer.advance(900);
        run('edit.resizeWider10');
        timer.advance(900);
        run('edit.resizeTaller1');

        expect(history.undoCount).toBe(1);
        expect(history.undoLabel).toBe('Resize Entity');

        timer.advance(1100);
        run('edit.resizeWider1');
        expect(history.undoCount).toBe(2);

        editor.undo();
        editor.undo();
        expect(geometryOf(rectangle)).toEqual(RECTANGLE);

        editor.redo();
        expect(geometryOf(rectangle)).toEqual({ kind: 'rectangle', width: 111, height: 41 });
    });

    test('start a new step after a turn, though within 1 s', () => {
        const { rectangle, selection, run, history } = buildResizeTest();
        selection.replace([rectangle.id]);

        run('edit.rotateRight1');
        run('edit.resizeWider1');

        expect(history.undoCount).toBe(2);
    });

    test('skip the camera with the skip rule, and leave groups and locked entities out', () => {
        const { level, rectangle, circle, group, selection, run } = buildResizeTest();
        circle.setLocked(true);
        selection.replace([level.camera.id, rectangle.id, circle.id, group.id]);

        const outcome = run('edit.resizeWider1');

        expect(outcome.kind === 'done' && outcomeText(outcome)).toBe('Camera kept');
        expect(geometryOf(rectangle)).toEqual({ kind: 'rectangle', width: 101, height: 40 });
        expect(geometryOf(circle)).toEqual(CIRCLE);
    });

    test('refuse with nothing to resize, giving the reason', () => {
        const { level, circle, group, selection, commands } = buildResizeTest();
        const resize = commands.find('edit.resizeWider1');

        expect(resize?.availability()).toEqual({ enabled: false, reason: 'Nothing selected' });

        selection.replace([level.world.id]);
        expect(resize?.run()).toEqual({ kind: 'refused', reason: "The World can't be resized" });

        selection.replace([level.camera.id]);
        expect(resize?.availability()).toEqual({ enabled: false, reason: "The camera can't be resized" });

        selection.replace([group.id]);
        expect(resize?.availability()).toEqual({ enabled: false, reason: 'Only shapes resize with W, A, S and D' });

        circle.setLocked(true);
        selection.replace([circle.id]);
        expect(resize?.availability()).toEqual({ enabled: false, reason: "Locked entities don't resize" });
    });
});
