import { describe, expect, test } from 'vitest';

import { LengthDisplay } from './LengthDisplay.ts';

const METRES = new LengthDisplay('metres', 100);
const PIXELS = new LengthDisplay('pixels', 100);

describe('LengthDisplay', () => {
    test('in metres, px and px/s show as m and m/s at the World scale, a pixel finer', () => {
        const position = { unit: 'px', precision: 2 } as const;
        const velocity = { unit: 'px/s' } as const;

        expect(METRES.shown(position)).toEqual({ unit: 'm', displayScale: 0.01, precision: 4 });
        expect(METRES.shown(velocity)).toEqual({ unit: 'm/s', displayScale: 0.01, precision: 4 });
    });

    test('a unit that is not a length, or any unit in pixels, shows as it is', () => {
        const angle = { unit: '°' } as const;
        const position = { unit: 'px' } as const;

        expect(METRES.shown(angle)).toBe(angle);
        expect(PIXELS.shown(position)).toBe(position);
    });

    test('a typed length goes back to exact pixels', () => {
        expect(METRES.toPixels(0.07)).toBe(7);
        expect(METRES.toPixels(1.23)).toBe(123);
        expect(new LengthDisplay('metres', 50).toPixels(0.07)).toBe(3.5);
        expect(PIXELS.toPixels(0.07)).toBe(0.07);
    });

    test('a stored length as text: whole pixels, or the metres one pixel needs', () => {
        expect(METRES.lengthText(123.4)).toBe('1.23');
        expect(METRES.lengthText(100)).toBe('1');
        expect(METRES.lengthText(-0.2)).toBe('0');
        expect(PIXELS.lengthText(123.4)).toBe('123');
        expect(new LengthDisplay('metres', 1000).lengthText(1234)).toBe('1.234');
    });

    test('a size label: metres with the unit, or pixels as before', () => {
        expect(METRES.sizeText(1920, 1080)).toBe('19.2 × 10.8 m');
        expect(PIXELS.sizeText(1920, 1080)).toBe('1920 × 1080');
    });
});
