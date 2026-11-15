import type { EditorSession } from '../../session/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';

const NOTHING_TO_SELECT = 'Nothing to select';

// Selects every entity directly inside the current group, without the World and the camera. Never a step.
export class SelectAllCommand implements EditorCommand {
    readonly id = 'edit.selectAll';
    readonly label = 'Select all';
    readonly menu = { menu: 'Edit', section: 4, order: 10 } as const;
    readonly shortcuts = ['Ctrl+A'];
    private readonly session: EditorSession;

    constructor(session: EditorSession) {
        this.session = session;
    }

    availability(): Availability {
        const ids = this.selectableIds();
        if (ids.length === 0) return { enabled: false, reason: NOTHING_TO_SELECT };

        return { enabled: true };
    }

    run(): CommandOutcome {
        const ids = this.selectableIds();
        if (ids.length === 0) return { kind: 'refused', reason: NOTHING_TO_SELECT };

        this.session.openLevel.selection.replace(ids);

        return { kind: 'done' };
    }

    private selectableIds() {
        const { level, currentGroup } = this.session.openLevel;
        const children = currentGroup.group.children;
        const selectable = children.filter((entity) => entity !== level.world && entity !== level.camera);

        return selectable.map((entity) => entity.id);
    }
}
