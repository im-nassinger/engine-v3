import { DerivedCaches } from '../../core/derived/index.ts';
import type { Level } from '../../core/level/index.ts';
import { EntitiesRows, RenameRequest, RowClicks, SelectionReveal } from '../entities-panel/index.ts';
import { History, LevelEditor } from '../history/index.ts';
import { Selection } from '../selection/index.ts';
import type { Clock } from '../time/index.ts';

import { CurrentGroup } from './CurrentGroup.ts';

// The level open in the editor with everything that belongs to it. New and Import replace it as one
// piece, so nothing can keep pointing at the old level's selection or history by mistake.
export class OpenLevel {
    readonly level: Level;
    readonly caches: DerivedCaches;
    readonly selection: Selection;
    readonly currentGroup: CurrentGroup;
    readonly entitiesRows: EntitiesRows;
    readonly selectionReveal: SelectionReveal;
    readonly rowClicks: RowClicks;
    readonly renameRequest = new RenameRequest();
    readonly history: History;
    readonly editor: LevelEditor;

    constructor(level: Level, clock: Clock) {
        this.level = level;
        this.caches = new DerivedCaches(level);
        this.selection = new Selection(level);
        this.currentGroup = new CurrentGroup(level);
        this.entitiesRows = new EntitiesRows(level);
        this.selectionReveal = new SelectionReveal(this.selection, this.entitiesRows);
        this.rowClicks = new RowClicks(this.selection, this.entitiesRows, this.selectionReveal);
        this.history = new History(clock);
        this.editor = new LevelEditor({
            level,
            history: this.history,
            selection: this.selection,
            currentGroup: this.currentGroup,
        });
    }

    // Stops everything here following the level.
    dispose() {
        this.selectionReveal.dispose();
        this.entitiesRows.dispose();
        this.currentGroup.dispose();
        this.selection.dispose();
        this.caches.dispose();
    }
}
