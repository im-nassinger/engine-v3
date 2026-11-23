import { describe, expect, test } from 'vitest';

import { ShortcutSheetState } from './ShortcutSheetState.ts';

describe('ShortcutSheetState', () => {
    test('starts closed, and toggle opens and closes it', () => {
        const sheet = new ShortcutSheetState();
        expect(sheet.isOpen).toBe(false);

        sheet.toggle();
        expect(sheet.isOpen).toBe(true);

        sheet.toggle();
        expect(sheet.isOpen).toBe(false);
    });

    test('close says whether there was a sheet to close', () => {
        const sheet = new ShortcutSheetState();
        expect(sheet.close()).toBe(false);

        sheet.toggle();
        expect(sheet.close()).toBe(true);
        expect(sheet.isOpen).toBe(false);
    });

    test('tells its readers when it opens or closes, not when Esc finds it closed', () => {
        const sheet = new ShortcutSheetState();
        let changes = 0;
        sheet.version.subscribe(() => {
            changes += 1;
        });

        sheet.close();
        sheet.toggle();
        sheet.close();

        expect(changes).toBe(2);
    });
});
