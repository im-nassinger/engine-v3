import { describe, expect, test } from 'vitest';

import { ShortcutSheetState } from '../../shortcut-sheet/index.ts';

import { ShortcutListCommand } from './ShortcutListCommand.ts';

describe('ShortcutListCommand', () => {
    test('is Help › Keyboard shortcuts on ?, always available', () => {
        const command = new ShortcutListCommand(new ShortcutSheetState());

        expect(command.availability()).toEqual({ enabled: true });
        expect(command.menu.menu).toBe('Help');
        expect(command.label).toBe('Keyboard shortcuts');
        expect(command.shortcuts).toEqual(['?']);
    });

    test('opens the sheet, and closes it when run again', () => {
        const sheet = new ShortcutSheetState();
        const command = new ShortcutListCommand(sheet);

        expect(command.run()).toEqual({ kind: 'done' });
        expect(sheet.isOpen).toBe(true);

        command.run();
        expect(sheet.isOpen).toBe(false);
    });
});
