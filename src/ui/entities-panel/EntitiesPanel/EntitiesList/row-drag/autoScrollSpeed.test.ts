import { describe, expect, test } from 'vitest';
import { autoScrollSpeed } from './autoScrollSpeed.ts';

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
        expect(autoScrollSpeed(20, EDGES)).toBe(-20);
        expect(autoScrollSpeed(900, EDGES)).toBe(20);
    });
});
