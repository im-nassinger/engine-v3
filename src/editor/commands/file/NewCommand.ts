import { Level } from '../../../core/level/index.ts';
import type { EditorSession } from '../../session/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';

import type { FileParts } from './FileParts.ts';
import { LevelReplacement } from './LevelReplacement.ts';

export const NEW_LEVEL_TEXT = 'New level';

// New: replaces the open level with a new one after asking. Menu only, since browsers keep Ctrl+N.
export class NewCommand implements EditorCommand {
    readonly id = 'file.new';
    readonly label = 'New';
    readonly menu = { menu: 'File', section: 1, order: 10 } as const;
    readonly shortcuts = [];
    private readonly replacement: LevelReplacement;

    constructor(session: EditorSession, parts: FileParts) {
        this.replacement = new LevelReplacement(session, parts);
    }

    availability(): Availability {
        return { enabled: true };
    }

    run(): CommandOutcome {
        return this.replacement.ask(NEW_LEVEL_TEXT, () => this.replaceWithNewLevel());
    }

    private replaceWithNewLevel(): CommandOutcome {
        const level = Level.createNew();
        this.replacement.replace(level);

        return { kind: 'done', text: NEW_LEVEL_TEXT };
    }
}
