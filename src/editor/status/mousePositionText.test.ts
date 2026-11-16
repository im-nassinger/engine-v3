import { describe, expect, test } from 'vitest';

import { mousePositionText } from './mousePositionText.ts';

describe('mousePositionText', () => {
    test('whole level pixels with a minus sign', () => {
        expect(mousePositionText({ x: 120.4, y: -39.6 })).toBe('120, −40');
    });

    test('never −0', () => {
        expect(mousePositionText({ x: -0.2, y: 0 })).toBe('0, 0');
    });

    test('nothing outside the level view', () => {
        expect(mousePositionText(undefined)).toBe('');
    });
});
