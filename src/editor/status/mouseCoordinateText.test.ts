import { describe, expect, test } from 'vitest';

import { mouseCoordinateText } from './mouseCoordinateText.ts';

describe('mouseCoordinateText', () => {
    test('whole level pixels with a minus sign', () => {
        expect(mouseCoordinateText(120.4)).toBe('120');
        expect(mouseCoordinateText(-39.6)).toBe('−40');
    });

    test('never −0', () => {
        expect(mouseCoordinateText(-0.2)).toBe('0');
    });

    test('nothing outside the level view', () => {
        expect(mouseCoordinateText(undefined)).toBe('');
    });
});
