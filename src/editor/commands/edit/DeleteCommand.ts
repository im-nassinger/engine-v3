import type { Entity } from '../../../core/level/index.ts';
import { RemoveEntitiesChange } from '../../history/index.ts';
import type { EditTransaction } from '../../history/index.ts';
import type { EditorSession } from '../../session/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';
import { attachedJoints } from '../shared/attachedJoints.ts';
import { skipEntities } from '../shared/skipEntities.ts';
import type { SkipResult } from '../shared/skipEntities.ts';
import { stepLabel } from '../shared/stepLabel.ts';

const NOTHING_SELECTED = 'Nothing selected';

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
        const refusal = refusalReason(split);
        if (refusal !== undefined) return { enabled: false, reason: refusal };

        return { enabled: true };
    }

    run(): CommandOutcome {
        const split = this.splitSelection();
        const refusal = refusalReason(split);
        if (refusal !== undefined) return { kind: 'refused', reason: refusal };

        const { level, editor } = this.session.openLevel;
        const label = stepLabel('Delete', split.allowed);
        const roots = [...split.allowed, ...attachedJoints(level, split.allowed)];

        const outcome = editor.edit(label, (transaction) => {
            this.removeEach(transaction, roots);
            return { kind: 'done', selectAfter: [], skipped: split.skipped };
        });

        return outcome;
    }

    // Each change reads its entity's place just before it is removed, so undo puts them back in order.
    private removeEach(transaction: EditTransaction, roots: readonly Entity[]) {
        for (const root of roots) {
            const change = RemoveEntitiesChange.ofEntity(this.session.reader, root);
            transaction.apply(change);
        }
    }

    private splitSelection() {
        const { level, selection } = this.session.openLevel;

        return skipEntities(level, selection.entities, ['world', 'camera']);
    }
}

function refusalReason(split: SkipResult) {
    if (split.allowed.length > 0) return undefined;

    const skippedKinds = split.skipped.map((entity) => entity.kind);
    if (skippedKinds.includes('world')) return "The World can't be deleted";
    if (skippedKinds.includes('camera')) return "The camera can't be deleted";

    return NOTHING_SELECTED;
}
