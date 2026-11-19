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
    test('reads a typed percentage, with or without its %', () => {
        expect(zoomFromPercentText('150')).toBe(1.5);
        expect(zoomFromPercentText(' 25% ')).toBe(0.25);
        expect(zoomFromPercentText('12.5')).toBe(0.125);
    });

    test('gives nothing for what is not a positive number', () => {
        expect(zoomFromPercentText('')).toBeUndefined();
        expect(zoomFromPercentText('big')).toBeUndefined();
        expect(zoomFromPercentText('0')).toBeUndefined();
        expect(zoomFromPercentText('-50')).toBeUndefined();
    });
});
