import type { EditorSession } from '../../session/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';

const NOTHING_TO_REDO = 'Nothing to redo';

export class RedoCommand implements EditorCommand {
    readonly id = 'edit.redo';
    readonly label = 'Redo';
    readonly menu = { menu: 'Edit', section: 1, order: 20 } as const;
    readonly shortcuts = ['Ctrl+Shift+Z', 'Ctrl+Y'];
    private readonly session: EditorSession;

    constructor(session: EditorSession) {
        this.session = session;
    }

    availability(): Availability {
        const label = this.session.openLevel.history.redoLabel;
        if (label === undefined) return { enabled: false, reason: NOTHING_TO_REDO };

        return { enabled: true };
    }

    run(): CommandOutcome {
        const step = this.session.openLevel.editor.redo();
        if (step === undefined) return { kind: 'refused', reason: NOTHING_TO_REDO };

        return { kind: 'done', text: `Redid: ${step.label}` };
    }
}
