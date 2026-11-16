import { describe, expect, test } from 'vitest';

import { ClickCounter, DOUBLE_CLICK_DISTANCE_PX, DOUBLE_CLICK_MS } from './ClickCounter.ts';

const AT = { x: 100, y: 100 };

describe('ClickCounter', () => {
    test('a second press soon and close by is a double-click, and a third counts on', () => {
        const counter = new ClickCounter();

        expect(counter.press('left', AT, 0)).toBe(1);
        expect(counter.press('left', { x: 100 + DOUBLE_CLICK_DISTANCE_PX, y: 100 }, DOUBLE_CLICK_MS)).toBe(2);
        expect(counter.press('left', AT, DOUBLE_CLICK_MS + 100)).toBe(3);
    });

    test('too late, too far or another button starts again at 1', () => {
        const counter = new ClickCounter();

        counter.press('left', AT, 0);
        expect(counter.press('left', AT, DOUBLE_CLICK_MS + 1)).toBe(1);
        expect(counter.press('left', { x: 100 + DOUBLE_CLICK_DISTANCE_PX + 1, y: 100 }, DOUBLE_CLICK_MS + 2)).toBe(1);
        expect(counter.press('right', { x: 105, y: 100 }, DOUBLE_CLICK_MS + 3)).toBe(1);
    });
});
