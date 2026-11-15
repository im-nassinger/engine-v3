import { describe, expect, test } from 'vitest';

import type { Point } from '../../../core/geometry/index.ts';
import { ViewState } from '../../view/index.ts';
import type { LevelPointerInput, PointerButton } from '../Tool.ts';

import { PanGesture } from './PanGesture.ts';

// The pan reads only screen positions and buttons. The tools' test session imports this folder, so
// its pointerAt can't be used here.
function pointerAt(screenPosition: Point, button: PointerButton = 'left'): LevelPointerInput {
    return {
        levelPosition: screenPosition,
        screenPosition,
        button,
        modifiers: { shift: false, alt: false, ctrl: false },
        clickCount: 1,
    };
}

function buildPan() {
    const view = new ViewState();
    view.setSize(800, 600);
    const pan = new PanGesture(view);

    return { view, pan };
}

describe('PanGesture', () => {
    test('a left press pans only while Space is held', () => {
        const { pan } = buildPan();

        expect(pan.pointerDown(pointerAt({ x: 0, y: 0 }))).toBe(false);

        pan.spaceDown();
        expect(pan.pointerDown(pointerAt({ x: 0, y: 0 }))).toBe(true);
        expect(pan.isPanning).toBe(true);
    });

    test('a middle press pans at any time, and the right button never does', () => {
        const { pan } = buildPan();

        expect(pan.pointerDown(pointerAt({ x: 0, y: 0 }, 'right'))).toBe(false);
        expect(pan.pointerDown(pointerAt({ x: 0, y: 0 }, 'middle'))).toBe(true);
    });

    test('dragging moves the level with the mouse at any zoom', () => {
        const { view, pan } = buildPan();
        view.zoomAboutMiddle(4);
        const levelPointBefore = view.screenToLevel({ x: 100, y: 100 });

        pan.pointerDown(pointerAt({ x: 100, y: 100 }, 'middle'));
        pan.pointerMove(pointerAt({ x: 140, y: 70 }));
        pan.pointerMove(pointerAt({ x: 180, y: 40 }));

        const levelPointAfter = view.screenToLevel({ x: 180, y: 40 });
        expect(levelPointAfter.x).toBeCloseTo(levelPointBefore.x);
        expect(levelPointAfter.y).toBeCloseTo(levelPointBefore.y);
    });

    test('a pan started with Space goes on after Space is released, until its button is', () => {
        const { pan } = buildPan();

        pan.spaceDown();
        pan.pointerDown(pointerAt({ x: 0, y: 0 }));
        pan.spaceUp();

        expect(pan.pointerMove(pointerAt({ x: 10, y: 0 }))).toBe(true);
        expect(pan.pointerUp(pointerAt({ x: 10, y: 0 }, 'middle'))).toBe(false);
        expect(pan.pointerUp(pointerAt({ x: 10, y: 0 }))).toBe(true);
        expect(pan.pointerMove(pointerAt({ x: 20, y: 0 }))).toBe(false);
    });

    test('release forgets Space and the pan', () => {
        const { pan } = buildPan();

        pan.spaceDown();
        pan.pointerDown(pointerAt({ x: 0, y: 0 }));
        pan.release();

        expect(pan.isSpaceHeld).toBe(false);
        expect(pan.isPanning).toBe(false);
    });
});
