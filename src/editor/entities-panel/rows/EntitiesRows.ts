import type { Unsubscribe } from '../../../core/events/index.ts';
import { VersionCounter } from '../../../core/events/index.ts';
import type { Entity, EntityId, Level, LevelUpdate } from '../../../core/level/index.ts';

import type { EntitiesRow } from './EntitiesRow.ts';

// The Entities panel's visible rows: a pre-order walk from the World that skips folded children.
// Built only when read after the tree, the folds or a parent's eye changed, so a 10,000-entity level
// is walked once however often the rows are read.
export class EntitiesRows {
    // Moves when the rows may have changed. A row's own look follows its entity's version instead.
    readonly version = new VersionCounter();
    private readonly level: Level;
    private builtRows: readonly EntitiesRow[] | undefined;
    private readonly rowIndexById = new Map<EntityId, number>();
    private readonly unsubscribers: readonly Unsubscribe[];

    constructor(level: Level) {
        this.level = level;

        const unsubscribeUpdates = level.signals.updated.subscribe((update) => this.follow(update));
        const unsubscribeFolds = level.editorData.version.subscribe(() => this.markStale());
        this.unsubscribers = [unsubscribeUpdates, unsubscribeFolds];
    }

    get rows() {
        return this.buildWhenStale();
    }

    // -1 when the entity has no visible row, because a parent is folded.
    indexOf(id: EntityId) {
        this.buildWhenStale();
        const index = this.rowIndexById.get(id);
        if (index === undefined) return -1;

        return index;
    }

    // Unfolds every parent of the entity and returns its row's index, to scroll to.
    reveal(id: EntityId) {
        const entity = this.level.requireEntity(id);
        let parent = entity.parent;

        while (parent !== undefined) {
            this.level.editorData.setFolded(parent.id, false);
            parent = parent.parent;
        }

        return this.indexOf(id);
    }

    // Never an undo step. A row with no children has no arrow, so folding it does nothing.
    setFolded(id: EntityId, isFolded: boolean) {
        const entity = this.level.requireEntity(id);
        const hasChildren = entity.children.length > 0;
        if (!hasChildren) return;

        this.level.editorData.setFolded(id, isFolded);
    }

    dispose() {
        for (const unsubscribe of this.unsubscribers) {
            unsubscribe();
        }
    }

    private follow(update: LevelUpdate) {
        switch (update.kind) {
            case 'entityAdded':
            case 'entityRemoved':
            case 'entityMoved':
                this.markStale();
                return;
            case 'switchChanged': {
                const changesChildRows = update.switchName === 'hidden' && update.entity.children.length > 0;
                if (changesChildRows) {
                    this.markStale();
                }
                return;
            }
            default:
                return;
        }
    }

    private markStale() {
        this.builtRows = undefined;
        this.version.increment();
    }

    // Builds the rows and the index of each row together.
    private buildWhenStale() {
        if (this.builtRows !== undefined) return this.builtRows;

        const rows: EntitiesRow[] = [];
        this.rowIndexById.clear();
        this.addRows(this.level.world, 0, false, rows);
        this.builtRows = rows;

        return rows;
    }

    private addRows(entity: Entity, depth: number, hiddenByParent: boolean, rows: EntitiesRow[]) {
        const children = entity.children;
        const hasChildren = children.length > 0;
        const isFolded = hasChildren && this.level.editorData.isFolded(entity.id);

        this.rowIndexById.set(entity.id, rows.length);
        rows.push({ entityId: entity.id, depth, hasChildren, isFolded, hiddenByParent });

        if (isFolded) return;

        const childrenHiddenByParent = hiddenByParent || entity.isHidden;
        for (const child of children) {
            this.addRows(child, depth + 1, childrenHiddenByParent, rows);
        }
    }
}
