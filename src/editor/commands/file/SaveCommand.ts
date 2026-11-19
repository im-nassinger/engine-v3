import { SAVE_FAILED_TEXT } from '../../saving/index.ts';
import type { EditorSession } from '../../session/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';

import type { FileParts } from './FileParts.ts';

export const SAVED_TEXT = 'Saved in this browser';

// Save and Ctrl+S: saves to the browser now, without waiting for Autosave's delay. A save that fails says why
// in the message pill, which keeps showing it until a save works. The save finishes after run returns, so its
// status text comes then.
export class SaveCommand implements EditorCommand {
    readonly id = 'file.save';
    readonly label = 'Save';
    readonly menu = { menu: 'File', section: 1, order: 25 } as const;
    readonly shortcuts = ['Ctrl+S'];
    readonly shortcutScope = 'everywhere';
    private readonly session: EditorSession;
    private readonly parts: FileParts;

    constructor(session: EditorSession, parts: FileParts) {
        this.session = session;
        this.parts = parts;
    }

    availability(): Availability {
        return { enabled: true };
    }

    run(): CommandOutcome {
        const parts = this.parts;
        const status = this.session.status;

        parts.commitTyping();
        parts.saving.saveNow().then(
            () => status.show(parts.saveFailure() ?? SAVED_TEXT),
            () => status.show(SAVE_FAILED_TEXT),
        );

        return { kind: 'done' };
    }
}
