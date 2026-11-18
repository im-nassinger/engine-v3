import { describe, expect, test } from 'vitest';
import { placePopup, WINDOW_MARGIN_PX } from './placePopup.ts';
import type { PopupPlacement } from './placePopup.ts';

const WINDOW = { width: 640, height: 360 };
const BELOW_START: PopupPlacement = { side: 'below', align: 'start', gapPx: 4 };

function buttonAt(left: number, top: number) {
    return { left, top, right: left + 40, bottom: top + 20 };
}

describe('placePopup over or under', () => {
    test('opens under the button, lined up with its left edge, when it fits', () => {
        const button = buttonAt(100, 50);
        const placed = placePopup(button, { width: 200, height: 100 }, WINDOW, BELOW_START);

        expect(placed).toEqual({ left: 100, top: 74, room: 360 - WINDOW_MARGIN_PX - 70 - 4 });
    });

    test('opens over the button when only that side has room', () => {
        const button = buttonAt(100, 300);
        const placed = placePopup(button, { width: 200, height: 100 }, WINDOW, BELOW_START);

        expect(placed.top).toBe(300 - 4 - 100);
    });

    test('keeps the larger side and scrolls when neither side has room', () => {
        const button = buttonAt(100, 100);
        const placed = placePopup(button, { width: 200, height: 500 }, WINDOW, BELOW_START);

        expect(placed.top).toBe(124);
        expect(placed.room).toBe(360 - WINDOW_MARGIN_PX - 124);
    });

    test('slides left to stay inside the window', () => {
        const button = buttonAt(560, 50);
        const placed = placePopup(button, { width: 200, height: 100 }, WINDOW, BELOW_START);

        expect(placed.left).toBe(640 - WINDOW_MARGIN_PX - 200);
    });

    test('a centred popup wider than its button near the left edge starts inside the window', () => {
        const button = buttonAt(6, 50);
        const centred: PopupPlacement = { side: 'below', align: 'centre', gapPx: 4 };
        const placed = placePopup(button, { width: 120, height: 20 }, WINDOW, centred);

        expect(placed.left).toBe(WINDOW_MARGIN_PX);
    });

    test('lines up with the right edge when aligned to its end', () => {
        const button = buttonAt(300, 50);
        const end: PopupPlacement = { side: 'below', align: 'end', gapPx: 4 };
        const placed = placePopup(button, { width: 200, height: 100 }, WINDOW, end);

        expect(placed.left).toBe(340 - 200);
    });
});

describe('placePopup beside', () => {
    const beside: PopupPlacement = { side: 'beside', align: 'start', gapPx: 0 };

    test('opens to the right, level with the row', () => {
        const row = { left: 100, right: 300, top: 80, bottom: 106 };
        const placed = placePopup(row, { width: 200, height: 100 }, WINDOW, beside);

        expect(placed.left).toBe(300);
        expect(placed.top).toBe(80);
    });

    test('opens to the left when the right has no room', () => {
        const row = { left: 300, right: 500, top: 80, bottom: 106 };
        const placed = placePopup(row, { width: 200, height: 100 }, WINDOW, beside);

        expect(placed.left).toBe(100);
    });

    test('moves up so its bottom stays inside the window', () => {
        const row = { left: 100, right: 300, top: 300, bottom: 326 };
        const placed = placePopup(row, { width: 200, height: 100 }, WINDOW, beside);

        expect(placed.top).toBe(360 - WINDOW_MARGIN_PX - 100);
    });

    test('centred, its middle is level with the middle of its anchor', () => {
        const tool = { left: 10, right: 58, top: 100, bottom: 134 };
        const centred: PopupPlacement = { side: 'beside', align: 'centre', gapPx: 12 };

        const placed = placePopup(tool, { width: 170, height: 96 }, WINDOW, centred);

        expect(placed.left).toBe(58 + 12);
        expect(placed.top).toBe(117 - 48);
    });

    test("centred near the window's top, it slides down to stay inside", () => {
        const tool = { left: 10, right: 58, top: 10, bottom: 44 };
        const centred: PopupPlacement = { side: 'beside', align: 'centre', gapPx: 12 };

        const placed = placePopup(tool, { width: 170, height: 96 }, WINDOW, centred);

        expect(placed.top).toBe(WINDOW_MARGIN_PX);
    });
});
