import type { EditorSession } from '../../session/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';

import { renameLevel } from './renameLevel.ts';

export const RENAME_LEVEL_TEXT = 'The name shows in the browser tab and names the exported file.';

// File → Rename level…: asks for the name in a small dialog, since the level's name isn't on screen. The
// rename is one undo step, and a refused name keeps the old one and says why in the message pill.
export class RenameLevelCommand implements EditorCommand {
    readonly id = 'file.renameLevel';
    readonly label = 'Rename level…';
    readonly menu = { menu: 'File', section: 1, order: 40 } as const;
    readonly shortcuts = [];
    private readonly session: EditorSession;

    constructor(session: EditorSession) {
        this.session = session;
    }

    availability(): Availability {
        return { enabled: true };
    }

    run(): CommandOutcome {
        const request = {
            title: 'Rename level',
            text: RENAME_LEVEL_TEXT,
            fieldLabel: 'Level name',
            value: this.session.openLevel.level.name,
            confirmLabel: 'Rename',
        };

        return { kind: 'needsText', request, submit: (text) => renameLevel(this.session.openLevel, text) };
    }
}
