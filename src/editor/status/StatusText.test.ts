import { describe, expect, test } from 'vitest';

import { ManualTimer } from '../time/testing/index.ts';

import { StatusText } from './StatusText.ts';

describe('StatusText', () => {
    test('starts empty', () => {
        const status = new StatusText(new ManualTimer());

        expect(status.current).toBeUndefined();
    });

    test('clears after 4 seconds', () => {
        const timer = new ManualTimer();
        const status = new StatusText(timer);

        status.show('Undid: Delete Square');
        timer.advance(StatusText.showMs - 1);

        expect(status.current).toBe('Undid: Delete Square');

        timer.advance(1);

        expect(status.current).toBeUndefined();
    });

    test('a newer text replaces the old and restarts the 4 seconds', () => {
        const timer = new ManualTimer();
        const status = new StatusText(timer);

        status.show('Camera kept');
        timer.advance(3_000);
        status.show('World kept');
        timer.advance(3_000);

        expect(status.current).toBe('World kept');
        expect(timer.pendingCount).toBe(1);

        timer.advance(1_000);

        expect(status.current).toBeUndefined();
    });

    test('its version moves when it shows and when it clears', () => {
        const timer = new ManualTimer();
        const status = new StatusText(timer);
        let changes = 0;
        status.version.subscribe(() => (changes += 1));

        status.show('Camera kept');
        timer.advance(StatusText.showMs);

        expect(changes).toBe(2);
        expect(status.version.version).toBe(2);
    });
});
