import { describe, expect, test } from 'vitest';

import { ShapeComponent, StyleComponent, TransformComponent } from '../../../core/components/index.ts';
import type { Point, ShapeGeometry } from '../../../core/geometry/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { Level } from '../../../core/level/index.ts';
import { EditorSession } from '../../session/index.ts';
import { outcomeText } from '../../status/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { createCommandRegistry } from '../createCommandRegistry.ts';

const SQUARE: ShapeGeometry = { kind: 'rectangle', width: 100, height: 100 };
// A square whose own origin is its top left corner, so its box's centre is not its position.
const CORNER_SQUARE: ShapeGeometry = {
    kind: 'polygon',
    points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
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

// A square at 100, 100, a corner square at 300, 100, and a group mirrored across holding a corner square.
function buildRotateTest() {
    const level = Level.createNew();
    const square = addShape(level, level.world, { x: 100, y: 100 }, SQUARE);
    const corner = addShape(level, level.world, { x: 300, y: 100 }, CORNER_SQUARE);
    const mirrored = level.createEntity(level.world, 0);
    const mirroredTransform = new TransformComponent();
    mirroredTransform.set('scale', { x: -1, y: 1 });
    mirrored.addComponent(mirroredTransform);
    const mirroredChild = addShape(level, mirrored, { x: 0, y: 0 }, SQUARE);

    const timer = new ManualTimer();
    const session = new EditorSession({ level, clock: timer.clock, timer, frames: new ManualFrames() });
    const commands = createCommandRegistry(session);
    const run = (id: string) => {
        const command = commands.find(id);
        if (command === undefined) throw new Error(`No command ${id}.`);

        return command.run();
    };
    const { selection, history, editor, caches } = session.openLevel;
    const levelPositionOf = (entity: Entity, own: Point) => caches.worldMatrices.matrixOf(entity).apply(own);

    return {
        level,
        square,
        corner,
        mirrored,
        mirroredChild,
        timer,
        commands,
        run,
        selection,
        history,
        editor,
        levelPositionOf,
    };
}

function rotationOf(entity: Entity) {
    return entity.requireComponent(TransformComponent).get('rotation');
}

describe('the rotate commands', () => {
    test('are Z and X, Shift for 10°, with no menu entry, repeating while held', () => {
        const { commands } = buildRotateTest();
        const rotates = commands.all.filter((command) => command.id.startsWith('edit.rotate'));

        expect(rotates.map((command) => command.shortcuts[0])).toEqual(['Z', 'Shift+Z', 'X', 'Shift+X']);
        expect(rotates.every((command) => command.menu === undefined)).toBe(true);
        expect(rotates.every((command) => command.repeatsWhileHeld === true)).toBe(true);
        expect(commands.find('edit.rotateLeft10')?.label).toBe('Rotate counterclockwise 10°');
    });

    test('turn X clockwise and Z counterclockwise, 1° alone and 10° with Shift', () => {
        const { square, selection, run } = buildRotateTest();
        selection.replace([square.id]);

        run('edit.rotateRight10');
        run('edit.rotateRight10');
        run('edit.rotateLeft1');

        expect(rotationOf(square)).toBe(19);
    });

    test("turn each entity around its own box's centre", () => {
        const { square, corner, selection, run, levelPositionOf } = buildRotateTest();
        selection.replace([square.id, corner.id]);

        for (let press = 0; press < 9; press++) {
            run('edit.rotateRight10');
        }

        expect(rotationOf(square)).toBe(90);
        expect(rotationOf(corner)).toBe(90);
        expect(levelPositionOf(square, { x: 0, y: 0 })).toEqual({ x: 100, y: 100 });
        const cornerCentre = levelPositionOf(corner, { x: 50, y: 50 });
        expect(cornerCentre.x).toBeCloseTo(350, 9);
        expect(cornerCentre.y).toBeCloseTo(150, 9);
    });

    test('turn the way the key says on screen under a mirroring parent', () => {
        const { mirroredChild, selection, run } = buildRotateTest();
        selection.replace([mirroredChild.id]);

        run('edit.rotateRight1');

        expect(rotationOf(mirroredChild)).toBe(-1);
    });

    test('make one Rotate step of a run of presses within 1 s, undone and redone whole', () => {
        const { corner, selection, run, history, timer, editor, levelPositionOf } = buildRotateTest();
        selection.replace([corner.id]);

        run('edit.rotateRight1');
        timer.advance(900);
        run('edit.rotateRight10');
        timer.advance(900);
        run('edit.rotateLeft1');

        expect(history.undoCount).toBe(1);
        expect(history.undoLabel).toBe('Rotate Entity');

        timer.advance(1100);
        run('edit.rotateRight1');
        expect(history.undoCount).toBe(2);

        editor.undo();
        editor.undo();
        expect(rotationOf(corner)).toBe(0);
        expect(levelPositionOf(corner, { x: 0, y: 0 })).toEqual({ x: 300, y: 100 });

        editor.redo();
        expect(rotationOf(corner)).toBe(10);
    });

    test('start a new step after a nudge, though within 1 s', () => {
        const { square, selection, run, history } = buildRotateTest();
        selection.replace([square.id]);

        run('edit.nudgeRight1');
        run('edit.rotateRight1');

        expect(history.undoCount).toBe(2);
    });

    test('skip the camera with the skip rule, and leave locked entities out', () => {
        const { level, square, corner, selection, run } = buildRotateTest();
        corner.setLocked(true);
        selection.replace([level.camera.id, square.id, corner.id]);

        const outcome = run('edit.rotateRight1');

        expect(outcome.kind === 'done' && outcomeText(outcome)).toBe('Camera kept');
        expect(rotationOf(square)).toBe(1);
        expect(rotationOf(corner)).toBe(0);
        expect(rotationOf(level.camera)).toBe(0);
    });

    test('refuse with nothing to turn, giving the reason', () => {
        const { level, corner, selection, commands } = buildRotateTest();
        const rotate = commands.find('edit.rotateLeft1');

        expect(rotate?.availability()).toEqual({ enabled: false, reason: 'Nothing selected' });

        selection.replace([level.world.id]);
        expect(rotate?.run()).toEqual({ kind: 'refused', reason: "The World can't be rotated" });

        selection.replace([level.camera.id]);
        expect(rotate?.availability()).toEqual({ enabled: false, reason: "The camera can't be rotated" });

        corner.setLocked(true);
        selection.replace([corner.id]);
        expect(rotate?.availability()).toEqual({ enabled: false, reason: "Locked entities don't rotate" });
    });
});
