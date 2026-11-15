import type { EditorSession } from '../../session/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';

const NOTHING_TO_UNDO = 'Nothing to undo';
const DURING_A_DRAG = 'Not during a drag';

export class UndoCommand implements EditorCommand {
    readonly id = 'edit.undo';
    readonly label = 'Undo';
    readonly menu = { menu: 'Edit', section: 1, order: 10 } as const;
    readonly shortcuts = ['Ctrl+Z'];
    private readonly session: EditorSession;

    constructor(session: EditorSession) {
        this.session = session;
    }

    // Ctrl+Z is ignored while a drag holds the mouse.
    availability(): Availability {
        if (this.session.openLevel.liveEdit.isActive) return { enabled: false, reason: DURING_A_DRAG };

        const label = this.session.openLevel.history.undoLabel;
        if (label === undefined) return { enabled: false, reason: NOTHING_TO_UNDO };

        return { enabled: true };
    }

    run(): CommandOutcome {
        if (this.session.openLevel.liveEdit.isActive) return { kind: 'refused', reason: DURING_A_DRAG };

        const step = this.session.openLevel.editor.undo();
        if (step === undefined) return { kind: 'refused', reason: NOTHING_TO_UNDO };

        return { kind: 'done', text: `Undid: ${step.label}` };
    }
}
