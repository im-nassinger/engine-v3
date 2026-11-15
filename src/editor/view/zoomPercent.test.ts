import { describe, expect, test } from 'vitest';

import { zoomFromPercentText, zoomPercentText } from './zoomPercent.ts';

describe('zoomPercentText', () => {
    test('shows a whole percentage', () => {
        expect(zoomPercentText(1)).toBe('100%');
        expect(zoomPercentText(0.4)).toBe('40%');
        expect(zoomPercentText(0.12345)).toBe('12%');
        expect(zoomPercentText(10)).toBe('1000%');
    });
});

describe('zoomFromPercentText', () => {
    test('reads a number with or without the percent sign', () => {
        expect(zoomFromPercentText('250')).toBe(2.5);
        expect(zoomFromPercentText(' 50 % ')).toBe(0.5);
        expect(zoomFromPercentText('12.5%')).toBe(0.125);
        expect(zoomFromPercentText('12,5')).toBe(0.125);
    });

    test('clamps to 1% and 1000%', () => {
        expect(zoomFromPercentText('5000')).toBe(10);
        expect(zoomFromPercentText('0')).toBe(0.01);
        expect(zoomFromPercentText('0.5')).toBe(0.01);
    });

    test('refuses what is not a number', () => {
        expect(zoomFromPercentText('')).toBeUndefined();
        expect(zoomFromPercentText('%')).toBeUndefined();
        expect(zoomFromPercentText('big')).toBeUndefined();
        expect(zoomFromPercentText('-50')).toBeUndefined();
        expect(zoomFromPercentText('1e3')).toBeUndefined();
    });
});
