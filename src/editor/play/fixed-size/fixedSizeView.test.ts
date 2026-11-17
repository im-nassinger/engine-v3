import { describe, expect, test } from 'vitest';

import { fixedSizeView } from './fixedSizeView.ts';

const BOX = { width: 1920, height: 1080 };

describe('fixedSizeView', () => {
    test('a 16:9 box in a 16:9 window has no bars', () => {
        const view = fixedSizeView(BOX, { width: 1280, height: 720 });

        expect(view.zoom).toBeCloseTo(2 / 3, 12);
        expect(view.middle).toEqual({ x: 640, y: 360 });
        expect(view.bars).toEqual([]);
    });

    test('a 4:3 window has bars above and below, and the box fills its width', () => {
        const view = fixedSizeView(BOX, { width: 1024, height: 768 });

        expect(view.zoom).toBeCloseTo(1024 / 1920, 12);
        expect(BOX.width * view.zoom).toBeCloseTo(1024, 9);
        expect(view.bars).toEqual([
            { x: 0, y: 0, width: 1024, height: 96 },
            { x: 0, y: 672, width: 1024, height: 96 },
        ]);
    });

    test('a 21:9 window has bars at the sides, and the box fills its height', () => {
        const view = fixedSizeView(BOX, { width: 2520, height: 1080 });

        expect(view.zoom).toBe(1);
        expect(BOX.height * view.zoom).toBe(1080);
        expect(view.bars).toEqual([
            { x: 0, y: 0, width: 300, height: 1080 },
            { x: 2220, y: 0, width: 300, height: 1080 },
        ]);
    });

    test('the bars and the box together cover the window exactly', () => {
        const window = { width: 1000, height: 900 };
        const view = fixedSizeView(BOX, window);
        const shownHeight = BOX.height * view.zoom;
        const barsHeight = view.bars.reduce((sum, bar) => sum + bar.height, 0);

        expect(shownHeight + barsHeight).toBeCloseTo(window.height, 9);
        expect(view.middle).toEqual({ x: 500, y: 450 });
    });

    test('the box is centred between the bars', () => {
        const view = fixedSizeView({ width: 800, height: 600 }, { width: 1600, height: 600 });
        const [left, right] = view.bars;

        expect(left?.width).toBe(400);
        expect(right?.x).toBe(1200);
        expect(view.middle.x).toBe(800);
    });
});
