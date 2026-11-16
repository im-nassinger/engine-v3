import { describe, expect, test } from 'vitest';

import { OpenWindowCount } from './OpenWindowCount.ts';

describe('OpenWindowCount', () => {
    test('is open while any window is, and closing one twice closes it once', () => {
        const windows = new OpenWindowCount();
        expect(windows.isOpen()).toBe(false);

        const closeMenu = windows.open();
        const closeDrag = windows.open();
        closeMenu();
        closeMenu();
        expect(windows.isOpen()).toBe(true);

        closeDrag();
        expect(windows.isOpen()).toBe(false);
    });
});
