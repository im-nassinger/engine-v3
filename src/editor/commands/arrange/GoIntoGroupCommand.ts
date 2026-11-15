import type { EditorSession } from '../../session/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';

const SELECT_ONE_GROUP = 'Select one group to go into';

// Enters the one selected entity that has children, the camera included, and clears the selection, since
// a key has no mouse position to pick a child with. Never a step.
export class GoIntoGroupCommand implements EditorCommand {
    readonly id = 'arrange.goIntoGroup';
    readonly label = 'Go into group';
    readonly menu = { menu: 'Arrange', section: 2, order: 10 } as const;
    readonly shortcuts = ['Enter'];
    private readonly session: EditorSession;

    constructor(session: EditorSession) {
        this.session = session;
    }

    availability(): Availability {
        const group = this.groupToEnter();
        if (group === undefined) return { enabled: false, reason: SELECT_ONE_GROUP };

        return { enabled: true };
    }

    run(): CommandOutcome {
        const group = this.groupToEnter();
        if (group === undefined) return { kind: 'refused', reason: SELECT_ONE_GROUP };

        const { currentGroup, selection } = this.session.openLevel;
        currentGroup.enter(group);
        selection.replace([]);

        return { kind: 'done' };
    }

    private groupToEnter() {
        const { level, selection } = this.session.openLevel;
        const selected = selection.entities;

        const onlySelected = selected.length === 1 ? selected[0] : undefined;
        if (onlySelected === undefined) return undefined;
        if (onlySelected === level.world) return undefined;
        if (onlySelected.children.length === 0) return undefined;

        return onlySelected;
    }
}
