import { describe, expect, test } from 'vitest';

import { runTimeText } from './runTimeText.ts';

describe('runTimeText', () => {
    test('reads 0:00.00 before the first tick', () => {
        expect(runTimeText(0)).toBe('0:00.00');
    });

    test('gives minutes, seconds and hundredths, cutting what is less than a hundredth', () => {
        // 2,531 ticks are 42.1833 s.
        expect(runTimeText(2_531)).toBe('0:42.18');
        expect(runTimeText(1)).toBe('0:00.01');
        expect(runTimeText(60)).toBe('0:01.00');
    });

    test('counts minutes past 59 seconds and past ten minutes', () => {
        expect(runTimeText(3_600)).toBe('1:00.00');
        expect(runTimeText(60 * 60 * 12 + 30)).toBe('12:00.50');
    });
});
