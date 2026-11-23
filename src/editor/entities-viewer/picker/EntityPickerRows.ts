import type { Entity, EntityId, Level } from '../../../core/level/index.ts';
import { labelName } from '../../../core/level/index.ts';

// One row of the entity picker's tree, laid out as the Entities viewer lays it out.
export type EntityPickerRow = {
    readonly entityId: EntityId;
    readonly depth: number;
    readonly hasChildren: boolean;
    readonly isFolded: boolean;
    // While searching: the entity's name holds the search. Its parents are shown too, so it reads in
    // its place in the tree.
    readonly isMatch: boolean;
};

// The rows of the entity picker: the Entities viewer's tree, from the World down. Without a search, a
// row is folded as the picker's own folds say, or as the Entities viewer's are; the picker's folds never
// change the panel's. With a search, only the entities whose name holds it are shown, with their parents,
// unfolded.
export class EntityPickerRows {
    static build(level: Level, folds: ReadonlyMap<EntityId, boolean>, search: string) {
        const wanted = search.trim().toLowerCase();
        const rows: EntityPickerRow[] = [];

        if (wanted === '') {
            addFoldedRows(level, level.world, 0, folds, rows);
            return rows;
        }

        addMatchingRows(level.world, 0, wanted, rows);
        return rows;
    }
}

function addFoldedRows(
    level: Level,
    entity: Entity,
    depth: number,
    folds: ReadonlyMap<EntityId, boolean>,
    rows: EntityPickerRow[],
) {
    const hasChildren = entity.children.length > 0;
    const isFolded = hasChildren && (folds.get(entity.id) ?? level.editorData.isFolded(entity.id));
    rows.push({ entityId: entity.id, depth, hasChildren, isFolded, isMatch: false });
    if (isFolded) return;

    for (const child of entity.children) {
        addFoldedRows(level, child, depth + 1, folds, rows);
    }
}

// Adds the entity's row and its matching children's, and says whether anything was added.
function addMatchingRows(entity: Entity, depth: number, wanted: string, rows: EntityPickerRow[]): boolean {
    const name = labelName(entity).toLowerCase();
    const isMatch = name.includes(wanted);
    const rowIndex = rows.length;
    const row: EntityPickerRow = {
        entityId: entity.id,
        depth,
        hasChildren: entity.children.length > 0,
        isFolded: false,
        isMatch,
    };
    rows.push(row);

    let hasMatchInside = false;
    for (const child of entity.children) {
        const childMatched = addMatchingRows(child, depth + 1, wanted, rows);
        hasMatchInside = hasMatchInside || childMatched;
    }

    const isShown = isMatch || hasMatchInside;
    if (!isShown) {
        rows.splice(rowIndex, 1);
    }

    return isShown;
}
