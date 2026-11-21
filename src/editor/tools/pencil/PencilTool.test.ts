import { describe, expect, test } from 'vitest';

import { PathComponent, TransformComponent } from '../../../core/components/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import { labelName } from '../../../core/level/index.ts';
import { pointer } from '../pen/testing/penToolTest.ts';
import { SelectTool } from '../select/SelectTool.ts';
import { buildSessionWithTools } from '../testing/toolTestSession.ts';

import { PENCIL_HINT, PencilTool } from './PencilTool.ts';
import type { PencilSmoothness } from './pencilStroke.ts';

function buildPencilTest() {
    const pencil = new PencilTool();
    const setup = buildSessionWithTools([new SelectTool(), pencil]);
    setup.controller.pick('pencil');

    return { ...setup, pencil };
}

type PencilSetup = ReturnType<typeof buildPencilTest>;

// A circle of the given radius around a centre, from the angle 0 round to `turn` of a full turn.
function arc(centre: Point, radius: number, turn: number, steps = 120): Point[] {
    const points: Point[] = [];
    for (let step = 0; step <= steps; step++) {
        const angle = (step / steps) * turn * 2 * Math.PI;
        points.push({ x: centre.x + radius * Math.cos(angle), y: centre.y + radius * Math.sin(angle) });
    }

    return points;
}

// A wavy line, so the fit needs more than one curve at a low tolerance.
function wave(steps = 200): Point[] {
    const points: Point[] = [];
    for (let step = 0; step <= steps; step++) {
        points.push({ x: 100 + step * 3, y: 300 + 40 * Math.sin(step / 8) + 2 * Math.sin(step * 1.3) });
    }

    return points;
}

function press(setup: PencilSetup, at: Point) {
    setup.controller.pointerMove(pointer(at));
    setup.controller.pointerDown(pointer(at));
}

function moveThrough(setup: PencilSetup, points: readonly Point[]) {
    for (const point of points) {
        setup.controller.pointerMove(pointer(point));
    }
}

function stroke(setup: PencilSetup, points: readonly Point[]) {
    const [first] = points;
    const last = points.at(-1);
    if (first === undefined || last === undefined) throw new Error('A stroke needs points.');

    press(setup, first);
    moveThrough(setup, points.slice(1));
    setup.controller.pointerUp(pointer(last));
}

function made(setup: PencilSetup) {
    const ids = setup.session.openLevel.selection.ids;
    if (ids.length !== 1) throw new Error(`${String(ids.length)} entities are selected.`);

    return setup.level.requireEntity(ids[0] ?? 0);
}

function madePath(setup: PencilSetup) {
    return made(setup).requireComponent(PathComponent).get('path');
}

function undoCount(setup: PencilSetup) {
    return setup.session.openLevel.history.undoCount;
}

describe('PencilTool', () => {
    test('picking it clears the selection and shows the hint', () => {
        const setup = buildPencilTest();
        setup.controller.pick('select');
        setup.session.openLevel.selection.replace([setup.square.id]);

        setup.controller.pick('pencil');

        expect(setup.session.openLevel.selection.isEmpty).toBe(true);
        expect(setup.session.status.current).toBe(PENCIL_HINT);
    });

    test('a stroke becomes one smooth open path, Path 1, selected, in one step, and returns to Select', () => {
        const setup = buildPencilTest();

        stroke(setup, wave());

        const path = madePath(setup);
        expect(path.closed).toBe(false);
        expect(path.points.length).toBeGreaterThanOrEqual(2);
        expect(path.points.length).toBeLessThan(40);
        expect(path.points.every((point) => point.corner === 'smooth')).toBe(true);
        expect(labelName(made(setup))).toBe('Path 1');
        expect(undoCount(setup)).toBe(1);
        expect(setup.session.openLevel.history.undoLabel).toBe('Draw Path 1');
        expect(setup.controller.active.id).toBe('select');
    });

    test('a straight stroke gives two points', () => {
        const setup = buildPencilTest();
        const line = Array.from({ length: 50 }, (_, step) => ({ x: 100 + step * 4, y: 200 }));

        stroke(setup, line);

        expect(madePath(setup).points).toHaveLength(2);
    });

    test('a release near the press closes the path, the tail inside the ring dropped', () => {
        const setup = buildPencilTest();
        // Round to 98.5% of a turn: the release is about 9 px from the press.
        const loop = arc({ x: 400, y: 300 }, 100, 0.985);

        stroke(setup, loop);

        const path = madePath(setup);
        expect(path.closed).toBe(true);
        expect(path.points.length).toBeGreaterThanOrEqual(3);
    });

    test('a release farther than 12 px from the press stays open', () => {
        const setup = buildPencilTest();
        const loop = arc({ x: 400, y: 300 }, 100, 0.9);

        stroke(setup, loop);

        expect(madePath(setup).closed).toBe(false);
    });

    test('a short scribble that never leaves the start’s ring stays open', () => {
        const setup = buildPencilTest();

        stroke(setup, [
            { x: 100, y: 100 },
            { x: 108, y: 100 },
            { x: 108, y: 106 },
            { x: 102, y: 102 },
        ]);

        expect(madePath(setup).closed).toBe(false);
    });

    test('the closing is measured on screen, so it holds at any zoom', () => {
        const setup = buildPencilTest();
        setup.session.view.zoomAboutMiddle(4);
        // 30 level units at zoom 4 is 120 screen px: too far to close.
        const loop = arc({ x: 400, y: 300 }, 100, 0.95);

        stroke(setup, loop);

        expect(madePath(setup).closed).toBe(false);
    });

    test('a press that moves less than 4 px makes nothing', () => {
        const setup = buildPencilTest();

        stroke(setup, [
            { x: 100, y: 100 },
            { x: 102, y: 101 },
        ]);

        expect(undoCount(setup)).toBe(0);
        expect(setup.controller.active.id).toBe('pencil');
    });

    test('the preview shows the stroke in level positions as dragged, and whether a release closes it', () => {
        const setup = buildPencilTest();
        const loop = arc({ x: 400, y: 300 }, 100, 0.985);
        press(setup, loop[0] ?? { x: 0, y: 0 });
        expect(setup.pencil.pencilStroke).toBeUndefined();

        moveThrough(setup, loop.slice(1, 40));
        expect(setup.pencil.pencilStroke?.points).toHaveLength(40);
        expect(setup.pencil.pencilStroke?.closing).toBe(false);

        moveThrough(setup, loop.slice(40));
        expect(setup.pencil.pencilStroke?.closing).toBe(true);

        setup.controller.pointerUp(pointer(loop.at(-1) ?? { x: 0, y: 0 }));
        expect(setup.pencil.pencilStroke).toBeUndefined();
    });

    test('a point closer than 1 screen px to the last one is skipped', () => {
        const setup = buildPencilTest();
        press(setup, { x: 100, y: 100 });

        moveThrough(setup, [
            { x: 110, y: 100 },
            { x: 110.5, y: 100 },
            { x: 112, y: 100 },
        ]);

        expect(setup.pencil.pencilStroke?.points).toHaveLength(3);
    });

    test('Esc during a drag drops the stroke, and the release then makes nothing', () => {
        const setup = buildPencilTest();
        const line = wave();
        press(setup, line[0] ?? { x: 0, y: 0 });
        moveThrough(setup, line.slice(1));

        expect(setup.controller.cancelDrawing()).toBe(true);
        setup.controller.pointerUp(pointer(line.at(-1) ?? { x: 0, y: 0 }));

        expect(setup.pencil.pencilStroke).toBeUndefined();
        expect(undoCount(setup)).toBe(0);
    });

    test('picking another tool during a drag keeps the stroke', () => {
        const setup = buildPencilTest();
        const line = wave();
        press(setup, line[0] ?? { x: 0, y: 0 });
        moveThrough(setup, line.slice(1));

        setup.controller.pick('select');

        expect(undoCount(setup)).toBe(1);
        expect(madePath(setup).closed).toBe(false);
    });

    test('with tool lock on, the Pencil stays active', () => {
        const setup = buildPencilTest();
        setup.controller.pick('pencil');
        expect(setup.controller.isLocked).toBe(true);

        stroke(setup, wave());

        expect(undoCount(setup)).toBe(1);
        expect(setup.controller.active.id).toBe('pencil');
    });

    test('the smoothness starts on Medium and is kept when the tool is picked again', () => {
        const setup = buildPencilTest();
        expect(setup.pencil.smoothness).toBe('medium');
        let changes = 0;
        setup.pencil.options.subscribe(() => {
            changes += 1;
        });

        setup.pencil.chooseSmoothness('high');
        setup.pencil.chooseSmoothness('high');
        setup.controller.pick('select');
        setup.controller.pick('pencil');

        expect(setup.pencil.smoothness).toBe('high');
        expect(changes).toBe(1);
    });

    test('a smoother setting gives fewer points for the same stroke, and the same stroke the same path', () => {
        const counts = (['low', 'medium', 'high'] as const).map((smoothness: PencilSmoothness) => {
            const setup = buildPencilTest();
            setup.pencil.chooseSmoothness(smoothness);
            stroke(setup, wave());

            return madePath(setup).points.length;
        });
        const [low = 0, medium = 0, high = 0] = counts;
        expect(low).toBeGreaterThan(medium);
        expect(medium).toBeGreaterThanOrEqual(high);

        const again = buildPencilTest();
        again.pencil.chooseSmoothness('low');
        stroke(again, wave());
        expect(madePath(again).points).toHaveLength(low);
    });

    test('draws in the current group’s own space', () => {
        const setup = buildPencilTest();
        setup.controller.pick('select');
        setup.group.requireComponent(TransformComponent).set('position', { x: 400, y: 300 });
        setup.session.openLevel.currentGroup.enter(setup.group);
        setup.controller.pick('pencil');

        stroke(setup, wave());

        expect(setup.group.children[0]).toBe(made(setup));
    });

    test('is refused inside a locked group, with nothing drawn', () => {
        const setup = buildPencilTest();
        setup.controller.pick('select');
        setup.group.setLocked(true);
        setup.session.openLevel.currentGroup.enter(setup.group);
        setup.controller.pick('pencil');

        stroke(setup, wave());

        expect(setup.session.status.current).toBe('This group is locked');
        expect(undoCount(setup)).toBe(0);
    });
});
