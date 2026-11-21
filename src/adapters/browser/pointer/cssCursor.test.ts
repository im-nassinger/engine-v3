import { describe, expect, test } from 'vitest';

import { cssCursor } from './cssCursor.ts';

describe('cssCursor', () => {
    test('the default leaves the page its own cursor, and rotate draws a turning arrow', () => {
        expect(cssCursor({ kind: 'default' })).toBe('');
        expect(cssCursor({ kind: 'rotate' })).toMatch(/^url\("data:image\/svg\+xml,.*"\) 12 12, auto$/);
    });

    test.each([
        [0, 'ew-resize'],
        [180, 'ew-resize'],
        [-170, 'ew-resize'],
        [45, 'nwse-resize'],
        [-135, 'nwse-resize'],
        [90, 'ns-resize'],
        [-90, 'ns-resize'],
        [135, 'nesw-resize'],
        [-45, 'nesw-resize'],
        [100, 'ns-resize'],
    ])('a handle pointing %s° gets %s', (directionDegrees, expected) => {
        expect(cssCursor({ kind: 'resize', directionDegrees })).toBe(expected);
    });
});
