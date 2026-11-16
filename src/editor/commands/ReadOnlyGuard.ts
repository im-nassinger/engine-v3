import { READ_ONLY_REASON } from '../history/index.ts';
import type { EditorSession } from '../session/index.ts';

import type { Availability, CommandOutcome, EditorCommand, MenuPlace, ShortcutScope } from './EditorCommand.ts';

// A command that edits the level, wrapped: in a read-only tab it is disabled and refused with the reason
// before its own rules are read. One wrapper instead of a check in each command, so a new command that
// edits only has to be registered through it.
export class ReadOnlyGuard implements EditorCommand {
    readonly id: string;
    readonly label: string;
    readonly menu: MenuPlace | undefined;
    readonly shortcuts: readonly string[];
    readonly shortcutScope: ShortcutScope | undefined;
    readonly repeatsWhileHeld: boolean | undefined;
    readonly shortcutsAsBrowserEvents: boolean | undefined;
    private readonly session: EditorSession;
    private readonly command: EditorCommand;

    constructor(session: EditorSession, command: EditorCommand) {
        this.session = session;
        this.command = command;
        this.id = command.id;
        this.label = command.label;
        this.menu = command.menu;
        this.shortcuts = command.shortcuts;
        this.shortcutScope = command.shortcutScope;
        this.repeatsWhileHeld = command.repeatsWhileHeld;
        this.shortcutsAsBrowserEvents = command.shortcutsAsBrowserEvents;
    }

    availability(): Availability {
        if (this.session.readOnly) return { enabled: false, reason: READ_ONLY_REASON };

        return this.command.availability();
    }

    run(): CommandOutcome {
        if (this.session.readOnly) return { kind: 'refused', reason: READ_ONLY_REASON };

        return this.command.run();
    }
}
