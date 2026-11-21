import { describe, expect, test } from 'vitest';

import {
    ENTER,
    SPACE,
    buildPenTest,
    click,
    clicks,
    drag,
    key,
    madePath,
    placesOf,
    pointer,
} from './testing/penToolTest.ts';

const ALT = key('AltLeft', 'Alt', { alt: true });

describe('PenTool drags', () => {
    test('a drag places a smooth point with mirrored handles; an open path loses its outer handles', () => {
        const setup = buildPenTest();

        drag(setup, { x: 100, y: 100 }, { x: 150, y: 100 });
        drag(setup, { x: 300, y: 100 }, { x: 300, y: 160 });
        setup.controller.keyDown(ENTER);

        const [first, second] = madePath(setup).points;
        expect(first).toEqual({ x: 100, y: 100, handleIn: null, handleOut: { x: 50, y: 0 }, corner: 'smooth' });
        expect(second).toEqual({ x: 300, y: 100, handleIn: { x: 0, y: -60 }, handleOut: null, corner: 'smooth' });
    });

    test('a press that moves less than 4 px is a click', () => {
        const setup = buildPenTest();

        drag(setup, { x: 100, y: 100 }, { x: 102, y: 102 });
        click(setup, { x: 300, y: 100 });
        setup.controller.keyDown(ENTER);

        expect(madePath(setup).points[0]?.corner).toBe('sharp');
    });

    test('the point being placed and its handles show while dragging', () => {
        const setup = buildPenTest();

        click(setup, { x: 100, y: 100 });
        setup.controller.pointerDown(pointer({ x: 300, y: 100 }));
        setup.controller.pointerMove(pointer({ x: 340, y: 130 }));

        expect(setup.pen.penDrawing).toMatchObject({
            placing: 1,
            next: undefined,
            points: [
                { x: 100, y: 100 },
                { x: 300, y: 100, handleIn: { x: -40, y: -30 }, handleOut: { x: 40, y: 30 } },
            ],
        });
    });

    test('Shift keeps the handle to 15°, keeping its length', () => {
        const setup = buildPenTest();

        drag(setup, { x: 100, y: 100 }, { x: 200, y: 108 }, { shift: true });
        click(setup, { x: 300, y: 300 });
        setup.controller.keyDown(ENTER);

        const handle = madePath(setup).points[0]?.handleOut;
        expect(handle?.x).toBeCloseTo(Math.hypot(100, 8));
        expect(handle?.y).toBeCloseTo(0);
    });

    test('Alt during the drag makes the point separate and moves the handle out alone', () => {
        const setup = buildPenTest();

        click(setup, { x: 0, y: 0 });
        setup.controller.pointerDown(pointer({ x: 100, y: 100 }));
        setup.controller.pointerMove(pointer({ x: 150, y: 100 }));
        setup.controller.keyDown(ALT);
        setup.controller.pointerMove(pointer({ x: 100, y: 160 }, { alt: true }));
        // The mirror stays broken once Alt let go.
        setup.controller.pointerMove(pointer({ x: 100, y: 170 }));
        setup.controller.pointerUp(pointer({ x: 100, y: 170 }));
        click(setup, { x: 300, y: 300 });
        setup.controller.keyDown(ENTER);

        expect(madePath(setup).points[1]).toEqual({
            x: 100,
            y: 100,
            handleIn: { x: -50, y: 0 },
            handleOut: { x: 0, y: 70 },
            corner: 'separate',
        });
    });

    test('Space during the drag moves the point with its handles, and letting go pulls the handle again', () => {
        const setup = buildPenTest();

        const screenOrigin = setup.session.view.levelToScreen({ x: 0, y: 0 });
        click(setup, { x: 0, y: 0 });
        setup.controller.pointerDown(pointer({ x: 100, y: 100 }));
        setup.controller.pointerMove(pointer({ x: 150, y: 100 }));
        expect(setup.controller.keyDown(SPACE)).toBe(true);
        setup.controller.pointerMove(pointer({ x: 170, y: 130 }));
        setup.controller.keyUp(SPACE);
        setup.controller.pointerMove(pointer({ x: 170, y: 160 }));
        setup.controller.pointerUp(pointer({ x: 170, y: 160 }));

        expect(setup.pan.isSpaceHeld).toBe(false);
        expect(setup.session.view.levelToScreen({ x: 0, y: 0 })).toEqual(screenOrigin);
        click(setup, { x: 300, y: 300 });
        setup.controller.keyDown(ENTER);
        expect(madePath(setup).points[1]).toEqual({
            x: 120,
            y: 130,
            handleIn: { x: -50, y: -30 },
            handleOut: { x: 50, y: 30 },
            corner: 'smooth',
        });
    });

    test('without a button down, Space pans as before', () => {
        const setup = buildPenTest();

        click(setup, { x: 0, y: 0 });
        setup.controller.keyDown(SPACE);

        expect(setup.pan.isSpaceHeld).toBe(true);
    });

    test('Esc during a drag finishes with the points placed before it', () => {
        const setup = buildPenTest();

        clicks(setup, [
            { x: 100, y: 100 },
            { x: 200, y: 100 },
        ]);
        setup.controller.pointerDown(pointer({ x: 300, y: 100 }));
        setup.controller.pointerMove(pointer({ x: 340, y: 100 }));
        setup.controller.cancelDrag();
        setup.controller.pointerUp(pointer({ x: 340, y: 100 }));

        expect(placesOf(madePath(setup))).toEqual([
            { x: 100, y: 100 },
            { x: 200, y: 100 },
        ]);
        expect(setup.session.openLevel.history.undoCount).toBe(1);
    });

    test('Ctrl+Z during a drag does nothing', () => {
        const setup = buildPenTest();

        clicks(setup, [
            { x: 100, y: 100 },
            { x: 200, y: 100 },
        ]);
        setup.controller.pointerDown(pointer({ x: 300, y: 100 }));
        setup.controller.pointerMove(pointer({ x: 340, y: 100 }));

        expect(setup.controller.undoDrawingStep()).toBe(true);
        expect(setup.pen.penDrawing?.points).toHaveLength(3);
    });
});

describe('PenTool closing drag', () => {
    const OPEN = [
        { x: 100, y: 100 },
        { x: 300, y: 100 },
        { x: 200, y: 300 },
    ];

    test('dragging on the first point shapes the closing curve: smooth, its handle in mirrored', () => {
        const setup = buildPenTest();

        clicks(setup, OPEN);
        drag(setup, { x: 102, y: 100 }, { x: 140, y: 70 });

        const path = madePath(setup);
        expect(path.closed).toBe(true);
        expect(placesOf(path)).toEqual(OPEN);
        expect(path.points[0]).toEqual({
            x: 100,
            y: 100,
            handleIn: { x: -40, y: 30 },
            handleOut: { x: 40, y: -30 },
            corner: 'smooth',
        });
        expect(setup.controller.active.id).toBe('select');
    });

    test('with Alt only the handle in moves, and the first point turns separate', () => {
        const setup = buildPenTest();

        drag(setup, { x: 100, y: 100 }, { x: 100, y: 50 });
        clicks(setup, OPEN.slice(1));
        drag(setup, { x: 100, y: 100 }, { x: 150, y: 100 }, { alt: true });

        expect(madePath(setup).points[0]).toEqual({
            x: 100,
            y: 100,
            handleIn: { x: -50, y: 0 },
            handleOut: { x: 0, y: -50 },
            corner: 'separate',
        });
    });

    test('a smooth first point closed by a click keeps its handle in', () => {
        const setup = buildPenTest();

        drag(setup, { x: 100, y: 100 }, { x: 100, y: 50 });
        clicks(setup, OPEN.slice(1));
        click(setup, { x: 100, y: 100 });

        expect(madePath(setup).points[0]?.handleIn).toEqual({ x: 0, y: 50 });
    });
});
