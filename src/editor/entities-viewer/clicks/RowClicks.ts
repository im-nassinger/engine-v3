import type { EntityId } from '../../../core/level/index.ts';
import type { Selection } from '../../selection/index.ts';
import type { SelectionReveal } from '../reveal/SelectionReveal.ts';
import type { EntitiesRows } from '../rows/EntitiesRows.ts';

export type RowClickKind = 'click' | 'ctrlClick' | 'shiftClick';

// What a click on an Entities panel row does to the selection. Never changes the current group.
// The anchor is the last row clicked without Shift; Shift+click selects the visible rows from it to
// the clicked row, in row order, and replaces the selection. A clicked row is already on screen, so
// its selection reveals nothing.
export class RowClicks {
    private readonly selection: Selection;
    private readonly entitiesRows: EntitiesRows;
    private readonly selectionReveal: SelectionReveal;
    private anchorId: EntityId | undefined;

    constructor(selection: Selection, entitiesRows: EntitiesRows, selectionReveal: SelectionReveal) {
        this.selection = selection;
        this.entitiesRows = entitiesRows;
        this.selectionReveal = selectionReveal;
    }

    click(id: EntityId, kind: RowClickKind) {
        this.selectionReveal.fromPanel(() => this.selectFromClick(id, kind));
    }

    private selectFromClick(id: EntityId, kind: RowClickKind) {
        if (kind === 'shiftClick') {
            this.selectRange(id);
            return;
        }

        this.anchorId = id;

        if (kind === 'ctrlClick') {
            this.selection.toggle(id);
            return;
        }

        this.selection.replace([id]);
    }

    // With no anchor, or one without a visible row, Shift+click acts as a click.
    private selectRange(id: EntityId) {
        const clickedIndex = this.entitiesRows.indexOf(id);
        const anchorIndex = this.anchorIndex();

        if (anchorIndex === -1 || clickedIndex === -1) {
            this.selectFromClick(id, 'click');
            return;
        }

        const firstIndex = Math.min(anchorIndex, clickedIndex);
        const lastIndex = Math.max(anchorIndex, clickedIndex);
        const rowsInRange = this.entitiesRows.rows.slice(firstIndex, lastIndex + 1);
        const idsInRange = rowsInRange.map((row) => row.entityId);

        this.selection.replace(idsInRange);
    }

    // A removed anchor has no row either, so indexOf covers it.
    private anchorIndex() {
        if (this.anchorId === undefined) return -1;

        return this.entitiesRows.indexOf(this.anchorId);
    }
}
