import { SetSwitchChange } from '../../history/index.ts';
import type { EditorSession } from '../../session/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';
import { skipEntities } from '../shared/skipEntities.ts';
import type { SkipResult } from '../shared/skipEntities.ts';
import { stepLabel } from '../shared/stepLabel.ts';

// Hides every selected entity when any of them is shown, and shows them all otherwise, as Figma does.
// Only each entity's own switch changes. The World is skipped; the camera can be hidden.
export class HideOrShowCommand implements EditorCommand {
    readonly id = 'edit.hideOrShow';
    readonly label = 'Hide or show';
    readonly menu = { menu: 'Edit', section: 4, order: 30 } as const;
    readonly shortcuts = ['Ctrl+Shift+H'];
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

        const entities = split.allowed;
        const anyShown = entities.some((entity) => !entity.isHidden);
        const verb = anyShown ? 'Hide' : 'Show';
        const label = stepLabel(verb, entities);

        const outcome = this.session.openLevel.editor.edit(label, (transaction) => {
            for (const entity of entities) {
                if (entity.isHidden === anyShown) continue;

                const change = new SetSwitchChange(entity.id, 'hidden', entity.isHidden, anyShown);
                transaction.apply(change);
            }

            return { kind: 'done', skipped: split.skipped };
        });

        return outcome;
    }

    private splitSelection() {
        const { level, selection } = this.session.openLevel;

        return skipEntities(level, selection.entities, ['world']);
    }
}

function refusalReason(split: SkipResult) {
    if (split.allowed.length > 0) return undefined;
    if (split.skipped.length > 0) return "The World can't be hidden";

    return 'Nothing selected';
}
