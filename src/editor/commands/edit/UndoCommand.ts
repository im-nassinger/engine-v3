import type { EditorSession } from '../../session/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';

const NOTHING_TO_UNDO = 'Nothing to undo';

export class UndoCommand implements EditorCommand {
    readonly id = 'edit.undo';
    readonly label = 'Undo';
    readonly menu = { menu: 'Edit', section: 1, order: 10 } as const;
    readonly shortcuts = ['Ctrl+Z'];
    private readonly session: EditorSession;

    constructor(session: EditorSession) {
        this.session = session;
    }

    availability(): Availability {
        const label = this.session.openLevel.history.undoLabel;
        if (label === undefined) return { enabled: false, reason: NOTHING_TO_UNDO };

        return { enabled: true };
    }

    run(): CommandOutcome {
        const step = this.session.openLevel.editor.undo();
        if (step === undefined) return { kind: 'refused', reason: NOTHING_TO_UNDO };

        return { kind: 'done', text: `Undid: ${step.label}` };
    }
}
