import { READ_ONLY_REASON } from '../history/index.ts';
import type { EditorSession } from '../session/index.ts';

import type {
    Availability,
    CommandOutcome,
    EditorCommand,
    MenuPlace,
    ShortcutArea,
    ShortcutScope,
} from './EditorCommand.ts';

// A command that edits the level, wrapped: in a read-only tab it is disabled and refused with the reason
// before its own rules are read. One wrapper instead of a check in each command, so a new command that
// edits only has to be registered through it.
export class ReadOnlyGuard implements EditorCommand {
    readonly id: string;
    readonly menu: MenuPlace | undefined;
    readonly shortcuts: readonly string[];
    readonly shortcutScope: ShortcutScope | undefined;
    readonly shortcutName: string | undefined;
    readonly shortcutArea: ShortcutArea | undefined;
    readonly repeatsWhileHeld: boolean | undefined;
    readonly shortcutsAsBrowserEvents: boolean | undefined;
    private readonly session: EditorSession;
    private readonly command: EditorCommand;

    constructor(session: EditorSession, command: EditorCommand) {
        this.session = session;
        this.command = command;
        this.id = command.id;
        this.menu = command.menu;
        this.shortcuts = command.shortcuts;
        this.shortcutScope = command.shortcutScope;
        this.shortcutName = command.shortcutName;
        this.shortcutArea = command.shortcutArea;
        this.repeatsWhileHeld = command.repeatsWhileHeld;
        this.shortcutsAsBrowserEvents = command.shortcutsAsBrowserEvents;
    }

    // Read each time, since Undo and Redo name their step.
    get label() {
        return this.command.label;
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
