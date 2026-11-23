import { describe, expect, test } from 'vitest';
import { autoScrollSpeed, autoScrollStep } from './autoScrollSpeed.ts';

const EDGES = { top: 100, bottom: 700 };

describe('autoScrollSpeed', () => {
    test('away from both edges the list stays still', () => {
        expect(autoScrollSpeed(400, EDGES)).toBe(0);
    });

    test('near the top it scrolls up, near the bottom down, faster the closer', () => {
        const nearTop = autoScrollSpeed(130, EDGES);
        const closerToTop = autoScrollSpeed(105, EDGES);
        expect(nearTop).toBeLessThan(0);
        expect(closerToTop).toBeLessThan(nearTop);

        const nearBottom = autoScrollSpeed(670, EDGES);
        const closerToBottom = autoScrollSpeed(695, EDGES);
        expect(nearBottom).toBeGreaterThan(0);
        expect(closerToBottom).toBeGreaterThan(nearBottom);
    });

    test('past an edge it scrolls at the fastest', () => {
        expect(autoScrollSpeed(20, EDGES)).toBe(-1200);
        expect(autoScrollSpeed(900, EDGES)).toBe(1200);
    });
});

describe('autoScrollStep', () => {
    test('a longer frame scrolls further, so the speed per second holds at any frame rate', () => {
        expect(autoScrollStep(1200, 1000 / 60)).toBe(20);
        expect(autoScrollStep(1200, 1000 / 30)).toBe(40);
        expect(autoScrollStep(-1200, 1000 / 30)).toBe(-40);
    });

    test('a slow speed still moves a pixel, and a still list none', () => {
        expect(autoScrollStep(10, 1000 / 60)).toBe(1);
        expect(autoScrollStep(-10, 1000 / 60)).toBe(-1);
        expect(autoScrollStep(0, 1000 / 60)).toBe(0);
    });

    test('a frame after a long pause scrolls no more than a tenth of a second', () => {
        expect(autoScrollStep(1200, 5000)).toBe(120);
    });
});
