import { describe, expect, test } from 'vitest';

import { zoomPercentText } from './zoomPercent.ts';

describe('zoomPercentText', () => {
    test('shows a whole percentage', () => {
        expect(zoomPercentText(1)).toBe('100%');
        expect(zoomPercentText(0.4)).toBe('40%');
        expect(zoomPercentText(0.12345)).toBe('12%');
        expect(zoomPercentText(10)).toBe('1000%');
    });
});
