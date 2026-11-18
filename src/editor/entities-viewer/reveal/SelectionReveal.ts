import { VersionCounter } from '../../../core/events/index.ts';
import type { Unsubscribe } from '../../../core/events/index.ts';
import type { EntityId } from '../../../core/level/index.ts';
import type { Selection } from '../../selection/index.ts';
import type { EntitiesRows } from '../rows/EntitiesRows.ts';

// Shows a selection made outside the Entities panel: unfolds the parents of every selected entity and
// asks the panel to scroll the newest one's row into view. A selection the panel makes itself, by a
// click or a drop, is already on screen, and a drop into a folded group must leave it folded.
export class SelectionReveal {
    // Moves when a row is asked to be scrolled into view, and when the ask is cleared.
    readonly version = new VersionCounter();
    private readonly selection: Selection;
    private readonly entitiesRows: EntitiesRows;
    private askedId: EntityId | undefined;
    private isPanelSelecting = false;
    private readonly unsubscribe: Unsubscribe;

    constructor(selection: Selection, entitiesRows: EntitiesRows) {
        this.selection = selection;
        this.entitiesRows = entitiesRows;
        this.unsubscribe = selection.version.subscribe(() => this.revealSelection());
    }

    // The row to scroll into view; undefined when nothing waits.
    get entityId() {
        return this.askedId;
    }

    clear() {
        if (this.askedId === undefined) return;

        this.askedId = undefined;
        this.version.increment();
    }

    // Runs a selection change made by the panel itself, which reveals nothing.
    fromPanel<Result>(selectInPanel: () => Result) {
        const wasPanelSelecting = this.isPanelSelecting;
        this.isPanelSelecting = true;

        try {
            return selectInPanel();
        } finally {
            this.isPanelSelecting = wasPanelSelecting;
        }
    }

    dispose() {
        this.unsubscribe();
    }

    private revealSelection() {
        if (this.isPanelSelecting) return;

        const selectedIds = this.selection.ids;
        const newestId = selectedIds.at(-1);
        if (newestId === undefined) return;

        for (const id of selectedIds) {
            this.entitiesRows.reveal(id);
        }

        this.askedId = newestId;
        this.version.increment();
    }
}
