import type { ShortcutSheetState } from '../../shortcut-sheet/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';

// Help › Keyboard shortcuts and `?`, by its character so it works on every layout: opens the shortcut
// list's sheet, or closes it when open. Never a step.
export class ShortcutListCommand implements EditorCommand {
    readonly id = 'help.shortcuts';
    readonly label = 'Keyboard shortcuts';
    readonly menu = { menu: 'Help', section: 1, order: 5 } as const;
    readonly shortcuts = ['?'];
    // The v4 design's row in the list's View section.
    readonly shortcutName = 'Shortcut list';
    private readonly sheet: ShortcutSheetState;

    constructor(sheet: ShortcutSheetState) {
        this.sheet = sheet;
    }

    availability(): Availability {
        return { enabled: true };
    }

    run(): CommandOutcome {
        this.sheet.toggle();

        return { kind: 'done' };
    }
}
