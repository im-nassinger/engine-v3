import type { EditorSession } from '../../session/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';
import { removeEntities } from '../shared/removeEntities.ts';
import { skipEntities } from '../shared/skipEntities.ts';
import { skippedRefusal } from '../shared/skippedRefusal.ts';
import { stepLabel } from '../shared/stepLabel.ts';

// Removes the selection with everything inside it, and every joint attached to what was removed. The
// World and the camera are skipped. A joint inside a removed entity simply goes with it.
export class DeleteCommand implements EditorCommand {
    readonly id = 'edit.delete';
    readonly label = 'Delete';
    readonly menu = { menu: 'Edit', section: 2, order: 50 } as const;
    readonly shortcuts = ['Del', 'Backspace'];
    private readonly session: EditorSession;

    constructor(session: EditorSession) {
        this.session = session;
    }

    availability(): Availability {
        const split = this.splitSelection();
        const refusal = skippedRefusal(split, 'deleted');
        if (refusal !== undefined) return { enabled: false, reason: refusal };

        return { enabled: true };
    }

    run(): CommandOutcome {
        const split = this.splitSelection();
        const refusal = skippedRefusal(split, 'deleted');
        if (refusal !== undefined) return { kind: 'refused', reason: refusal };

        const label = stepLabel('Delete', split.allowed);

        return removeEntities(this.session, label, split.allowed, split.skipped);
    }

    private splitSelection() {
        const { level, selection } = this.session.openLevel;

        return skipEntities(level, selection.entities, ['world', 'camera']);
    }
}
