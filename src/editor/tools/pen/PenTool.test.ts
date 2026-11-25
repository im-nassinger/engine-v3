import { describe, expect, test } from 'vitest';

import { PathComponent, TransformComponent } from '../../../core/components/index.ts';
import { labelName } from '../../../core/level/index.ts';
import type { SnapResult, Snapper } from '../../snapping/index.ts';
import { TENS_SNAPPER } from '../shape/testing/shapeToolTest.ts';

import { PEN_HINT } from './PenTool.ts';
import { TOO_FEW_TO_CLOSE } from './states/PenIdleState.ts';
import {
    BACKSPACE,
    ENTER,
    buildPenTest,
    click,
    clicks,
    made,
    madePath,
    placesOf,
    pointer,
} from './testing/penToolTest.ts';
import type { PenSetup } from './testing/penToolTest.ts';

const TRIANGLE = [
    { x: 100, y: 100 },
    { x: 300, y: 100 },
    { x: 200, y: 300 },
];

// Rounds a point to the nearest 50 px, unless Ctrl is held: a step wider than the close ring.
const FIFTIES_SNAPPER: Snapper = {
    snapMove: (_bounds, offset): SnapResult => ({ point: offset, snappedX: false, snappedY: false }),
    snapPoint: (point, _view, options): SnapResult => {
        if (options.ctrlHeld) return { point, snappedX: false, snappedY: false };

        const snapped = { x: Math.round(point.x / 50) * 50, y: Math.round(point.y / 50) * 50 };

        return { point: snapped, snappedX: true, snappedY: true };
    },
};

function undoCount(setup: PenSetup) {
    return setup.session.openLevel.history.undoCount;
}

describe('PenTool clicks', () => {
    test('places sharp points; Enter makes one step, Path 1, selected, and returns to Select', () => {
        const setup = buildPenTest();

        clicks(setup, TRIANGLE);
        expect(undoCount(setup)).toBe(0);
        expect(setup.controller.keyDown(ENTER)).toBe(true);

        const path = madePath(setup);
        expect(path.closed).toBe(false);
        expect(placesOf(path)).toEqual(TRIANGLE);
        expect(path.points.every((point) => point.corner === 'sharp' && point.handleIn === null)).toBe(true);
        expect(labelName(made(setup))).toBe('Path 1');
        expect(made(setup).requireComponent(TransformComponent).get('position')).toEqual({ x: 200, y: 200 });
        expect(setup.level.world.children[0]).toBe(made(setup));
        expect(undoCount(setup)).toBe(1);
        expect(setup.session.openLevel.history.undoLabel).toBe('Draw Path 1');
        expect(setup.controller.active.id).toBe('select');
    });

    test('picking the pen clears the selection', () => {
        const setup = buildPenTest();
        setup.controller.pick('select');
        setup.session.openLevel.selection.replace([setup.square.id]);

        setup.controller.pick('pen');

        expect(setup.session.openLevel.selection.isEmpty).toBe(true);
    });

    test('picking the pen shows its hint', () => {
        const setup = buildPenTest();

        expect(setup.session.status.current).toBe(PEN_HINT);
    });

    test('a click snaps as a point, and Ctrl turns snapping off', () => {
        const setup = buildPenTest(TENS_SNAPPER);

        click(setup, { x: 103, y: 98 });
        click(setup, { x: 203, y: 98 }, { ctrl: true });
        setup.controller.keyDown(ENTER);

        expect(placesOf(madePath(setup))).toEqual([
            { x: 100, y: 100 },
            { x: 203, y: 98 },
        ]);
    });

    test('Shift turns the segment from the last point to a multiple of 15°, unsnapped', () => {
        const setup = buildPenTest(TENS_SNAPPER);

        click(setup, { x: 100, y: 100 });
        click(setup, { x: 200, y: 108 }, { shift: true });
        setup.controller.keyDown(ENTER);

        const second = madePath(setup).points[1];
        expect(second?.y).toBeCloseTo(100);
        expect(second?.x).toBeCloseTo(100 + Math.hypot(100, 8));
    });

    test('a click on the last point’s place adds nothing', () => {
        const setup = buildPenTest();

        clicks(setup, [
            { x: 100, y: 100 },
            { x: 200, y: 100 },
            { x: 200, y: 100 },
        ]);
        setup.controller.keyDown(ENTER);

        expect(madePath(setup).points).toHaveLength(2);
    });

    test('draws in the current group’s own space', () => {
        const setup = buildPenTest();
        setup.controller.pick('select');
        setup.group.requireComponent(TransformComponent).set('position', { x: 400, y: 300 });
        setup.session.openLevel.currentGroup.enter(setup.group);
        setup.controller.pick('pen');

        clicks(setup, [
            { x: 400, y: 300 },
            { x: 500, y: 300 },
        ]);
        setup.controller.keyDown(ENTER);

        const path = made(setup);
        expect(setup.group.children[0]).toBe(path);
        expect(path.requireComponent(TransformComponent).get('position')).toEqual({ x: 50, y: 0 });
    });

    test('is refused inside a locked group, with nothing drawn', () => {
        const setup = buildPenTest();
        setup.controller.pick('select');
        setup.group.setLocked(true);
        setup.session.openLevel.currentGroup.enter(setup.group);
        setup.controller.pick('pen');

        click(setup, { x: 100, y: 100 });

        expect(setup.session.status.current).toBe('This group is locked');
        expect(setup.pen.penDrawing?.points).toEqual([]);
    });
});

describe('PenTool closing', () => {
    test('a click on the first point closes the path from 3 points on, and finishes it', () => {
        const setup = buildPenTest();

        clicks(setup, TRIANGLE);
        click(setup, { x: 104, y: 103 });

        const path = madePath(setup);
        expect(path.closed).toBe(true);
        expect(placesOf(path)).toEqual(TRIANGLE);
        expect(undoCount(setup)).toBe(1);
        expect(setup.controller.active.id).toBe('select');
    });

    test('a press that snaps onto the first point closes the path, though it is outside the ring', () => {
        const setup = buildPenTest(FIFTIES_SNAPPER);

        clicks(setup, TRIANGLE);
        setup.controller.pointerMove(pointer({ x: 115, y: 90 }));
        expect(setup.pen.penDrawing).toMatchObject({ next: { x: 100, y: 100 }, closing: true });
        click(setup, { x: 115, y: 90 });

        const path = madePath(setup);
        expect(path.closed).toBe(true);
        expect(placesOf(path)).toEqual(TRIANGLE);
        expect(undoCount(setup)).toBe(1);
    });

    test('with Ctrl, which turns snapping off, a press outside the ring adds a point', () => {
        const setup = buildPenTest(FIFTIES_SNAPPER);

        clicks(setup, TRIANGLE);
        click(setup, { x: 115, y: 90 }, { ctrl: true });

        expect(setup.pen.penDrawing?.points).toHaveLength(4);
        expect(undoCount(setup)).toBe(0);
    });

    test('with fewer than 3 points a press on the first point is ignored, and the status says why', () => {
        const setup = buildPenTest();

        clicks(setup, [
            { x: 100, y: 100 },
            { x: 300, y: 100 },
            { x: 102, y: 100 },
        ]);

        expect(setup.pen.penDrawing?.points).toHaveLength(2);
        expect(undoCount(setup)).toBe(0);
        expect(setup.session.status.current).toBe(TOO_FEW_TO_CLOSE);
    });

    test('the preview says when a press would close', () => {
        const setup = buildPenTest();

        clicks(setup, TRIANGLE);
        setup.controller.pointerMove(pointer({ x: 105, y: 100 }));

        expect(setup.pen.penDrawing).toMatchObject({ next: { x: 100, y: 100 }, closing: true, placing: undefined });
        setup.controller.pointerMove(pointer({ x: 150, y: 150 }));
        expect(setup.pen.penDrawing).toMatchObject({ next: { x: 150, y: 150 }, closing: false });
    });
});

describe('PenTool finishing', () => {
    const ways: Record<string, (setup: PenSetup) => void> = {
        'a double-click, its second click adding no point': (setup) => {
            click(setup, { x: 300, y: 300 }, { clickCount: 2 });
        },
        'a right-click': (setup) => {
            setup.controller.pointerDown(pointer({ x: 500, y: 500 }, { button: 'right' }));
            setup.controller.pointerUp(pointer({ x: 500, y: 500 }, { button: 'right' }));
        },
        Esc: (setup) => {
            expect(setup.controller.cancelDrawing()).toBe(true);
        },
        'picking another tool': (setup) => {
            setup.controller.pick('select');
        },
    };

    for (const [way, finish] of Object.entries(ways)) {
        test(`${way} finishes the path open as one step`, () => {
            const setup = buildPenTest();

            clicks(setup, [
                { x: 100, y: 100 },
                { x: 300, y: 300 },
            ]);
            finish(setup);

            const path = madePath(setup);
            expect(path.closed).toBe(false);
            expect(placesOf(path)).toEqual([
                { x: 100, y: 100 },
                { x: 300, y: 300 },
            ]);
            expect(undoCount(setup)).toBe(1);
        });
    }

    test('Esc keeps the pen, and a second Esc returns to Select', () => {
        const setup = buildPenTest();

        clicks(setup, [
            { x: 100, y: 100 },
            { x: 300, y: 300 },
        ]);
        setup.controller.cancelDrawing();

        expect(setup.controller.active.id).toBe('pen');
        expect(made(setup).hasComponent(PathComponent)).toBe(true);
        expect(setup.controller.returnToSelect()).toBe(true);
    });

    test('fewer than 2 points is dropped', () => {
        const setup = buildPenTest();
        const entityCount = setup.level.entityCount;

        click(setup, { x: 100, y: 100 });
        setup.controller.keyDown(ENTER);

        expect(setup.level.entityCount).toBe(entityCount);
        expect(undoCount(setup)).toBe(0);
    });
});

describe('PenTool Ctrl+Z and Backspace', () => {
    test('remove the last point without a step', () => {
        const setup = buildPenTest();

        clicks(setup, TRIANGLE);
        expect(setup.controller.undoDrawingStep()).toBe(true);
        expect(setup.controller.keyDown(BACKSPACE)).toBe(true);
        click(setup, { x: 400, y: 100 });
        setup.controller.keyDown(ENTER);

        expect(placesOf(madePath(setup))).toEqual([
            { x: 100, y: 100 },
            { x: 400, y: 100 },
        ]);
        expect(undoCount(setup)).toBe(1);
    });

    test('removing the only point ends the drawing with nothing made, and Ctrl+Z goes on to Undo', () => {
        const setup = buildPenTest();

        click(setup, { x: 100, y: 100 });
        expect(setup.controller.undoDrawingStep()).toBe(true);

        expect(setup.pen.penDrawing?.points).toEqual([]);
        expect(setup.controller.undoDrawingStep()).toBe(false);
        expect(setup.controller.keyDown(BACKSPACE)).toBe(false);
    });
});

describe('PenTool point limit', () => {
    test('the 2,001st point is refused and the drawing goes on', () => {
        const setup = buildPenTest();
        for (let index = 0; index < 2_000; index++) {
            click(setup, { x: (index % 30) * 20 + 20, y: Math.floor(index / 30) * 20 + 20 });
        }

        click(setup, { x: 900, y: 500 });
        expect(setup.session.status.current).toBe('A path holds at most 2,000 points');
        expect(setup.pen.penDrawing?.points).toHaveLength(2_000);

        setup.controller.keyDown(ENTER);
        expect(madePath(setup).points).toHaveLength(2_000);
    });
});
