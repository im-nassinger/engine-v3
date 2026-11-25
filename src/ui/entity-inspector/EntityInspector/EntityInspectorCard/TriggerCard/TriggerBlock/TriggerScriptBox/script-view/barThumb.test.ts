import { describe, expect, test } from 'vitest';
import { barThumb, scrollPerDragPixel } from './barThumb.ts';

describe('barThumb', () => {
    test('is as long against its track as the view against the content', () => {
        const thumb = barThumb({ view: 300, content: 600, scroll: 0, track: 300 });
        expect(thumb).toEqual({ offset: 0, length: 150 });
    });

    test('moves along the track as the script scrolls', () => {
        const halfway = barThumb({ view: 300, content: 600, scroll: 150, track: 300 });
        const atEnd = barThumb({ view: 300, content: 600, scroll: 300, track: 300 });
        expect(halfway.offset).toBe(75);
        expect(atEnd.offset).toBe(150);
    });

    test('never gets shorter than 24 px, nor longer than its track', () => {
        const long = barThumb({ view: 100, content: 10_000, scroll: 0, track: 100 });
        const short = barThumb({ view: 100, content: 101, scroll: 0, track: 20 });
        expect(long.length).toBe(24);
        expect(short.length).toBe(20);
    });
});

describe('scrollPerDragPixel', () => {
    test('scrolls the whole overflow over the room the thumb has to move', () => {
        const measure = { view: 300, content: 600, scroll: 0, track: 300 };
        expect(scrollPerDragPixel(measure, 150)).toBe(2);
    });
});
