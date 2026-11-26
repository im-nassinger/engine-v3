import { describe, expect, test } from 'vitest';

import { LengthDisplay } from '../units/index.ts';
import { mouseCoordinateText } from './mouseCoordinateText.ts';

const METRES = new LengthDisplay('metres', 100);
const PIXELS = new LengthDisplay('pixels', 100);

describe('mouseCoordinateText', () => {
    test('metres to the pixel, with a minus sign', () => {
        expect(mouseCoordinateText(120.4, METRES)).toBe('1.2');
        expect(mouseCoordinateText(-3149.6, METRES)).toBe('−31.5');
    });

    test('whole level pixels in pixels', () => {
        expect(mouseCoordinateText(120.4, PIXELS)).toBe('120');
        expect(mouseCoordinateText(-39.6, PIXELS)).toBe('−40');
    });

    test('never −0', () => {
        expect(mouseCoordinateText(-0.2, PIXELS)).toBe('0');
        expect(mouseCoordinateText(-0.2, METRES)).toBe('0');
    });

    test('nothing outside the level view', () => {
        expect(mouseCoordinateText(undefined, METRES)).toBe('');
    });
});
