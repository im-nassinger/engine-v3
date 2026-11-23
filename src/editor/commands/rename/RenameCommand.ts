import type { EditorSession } from '../../session/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';

const SELECT_ONE_ENTITY = 'Select one entity to rename';
const WORLD_REFUSED = "The World can't be renamed";

// F2: only starts renaming. It unfolds the row's parents and asks the Entities panel to open the row's
// name box; the panel calls renameEntity with the typed name, which makes the step.
export class RenameCommand implements EditorCommand {
    readonly id = 'edit.rename';
    readonly label = 'Rename';
    readonly shortcuts = ['F2'];
    readonly shortcutName = 'Rename the selected entity';
    readonly shortcutArea = 'Selecting';
    private readonly session: EditorSession;

    constructor(session: EditorSession) {
        this.session = session;
    }

    availability(): Availability {
        const refusal = this.refusalReason();
        if (refusal !== undefined) return { enabled: false, reason: refusal };

        return { enabled: true };
    }

    run(): CommandOutcome {
        const refusal = this.refusalReason();
        if (refusal !== undefined) return { kind: 'refused', reason: refusal };

        const { selection, entitiesRows, renameRequest } = this.session.openLevel;
        const [entity] = selection.entities;
        if (entity === undefined) return { kind: 'refused', reason: SELECT_ONE_ENTITY };

        entitiesRows.reveal(entity.id);
        renameRequest.request(entity.id);

        return { kind: 'done' };
    }

    private refusalReason() {
        const { level, selection } = this.session.openLevel;
        const selected = selection.entities;

        if (selected.length !== 1) return SELECT_ONE_ENTITY;
        if (selected[0] === level.world) return WORLD_REFUSED;

        return undefined;
    }
}
