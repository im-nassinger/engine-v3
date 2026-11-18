import type { Entity, EntityId, Level } from '../../../core/level/index.ts';
import type { EntitiesRows } from '../rows/EntitiesRows.ts';

// Where the pointer is over the list while rows are dragged.
export type DropPointer = {
    readonly rowIndex: number;
    // 0 at the row's top edge, 1 at its bottom edge.
    readonly heightFraction: number;
    // The depth the pointer's indent points at: the World's is 0, an entity directly inside it 1.
    readonly pointerDepth: number;
};

// Where the dragged entities land, and where the panel draws the line that shows it.
export type DropTarget = {
    readonly parentId: EntityId;
    // Among the parent's children as they are before the move, the dragged ones included.
    readonly index: number;
    // The line is drawn under this row, indented to this depth.
    readonly lineBelowRowIndex: number;
    readonly lineDepth: number;
};

type PlaceInRow = 'above' | 'into' | 'below';

const ABOVE_BELOW_SHARE = 1 / 3;

// Decides with the row's thirds: the top third is above the row, the bottom third below, the middle
// into it, at its top. Below a row whose subtree ends there, the pointer's indent picks how many levels
// up the drop lands. A refused place gives no target, so the panel draws no line.
export class EntitiesDrop {
    private readonly level: Level;
    private readonly entitiesRows: EntitiesRows;

    constructor(level: Level, entitiesRows: EntitiesRows) {
        this.level = level;
        this.entitiesRows = entitiesRows;
    }

    targetAt(draggedIds: readonly EntityId[], pointer: DropPointer) {
        const row = this.entitiesRows.rows[pointer.rowIndex];
        if (row === undefined) return undefined;

        const entity = this.level.requireEntity(row.entityId);
        const placeInRow = placeFromFraction(pointer.heightFraction);
        const target = this.targetForPlace(entity, pointer, placeInRow);
        if (target === undefined) return undefined;

        const isAllowed = this.allowsDrop(draggedIds, target.parentId);
        if (!isAllowed) return undefined;

        return target;
    }

    private targetForPlace(entity: Entity, pointer: DropPointer, placeInRow: PlaceInRow) {
        if (placeInRow === 'above') return this.targetAbove(entity, pointer.rowIndex);
        if (placeInRow === 'into') return targetInto(entity, pointer.rowIndex);

        return this.targetBelow(entity, pointer);
    }

    // Above a row is the same place as the line under the row before it.
    private targetAbove(entity: Entity, rowIndex: number): DropTarget | undefined {
        const parent = entity.parent;
        if (parent === undefined) return undefined;

        const index = parent.children.indexOf(entity);

        return { parentId: parent.id, index, lineBelowRowIndex: rowIndex - 1, lineDepth: entity.depth };
    }

    private targetBelow(entity: Entity, pointer: DropPointer): DropTarget | undefined {
        const row = this.entitiesRows.rows[pointer.rowIndex];
        const showsChildren = row !== undefined && row.hasChildren && !row.isFolded;
        const isWorld = entity === this.level.world;
        if (showsChildren || isWorld) return targetInto(entity, pointer.rowIndex);

        const lineDepth = this.depthBelowSubtreeEnd(entity, pointer);
        const landsBeside = ancestorAtDepth(entity, lineDepth);
        const parent = landsBeside.parent;
        if (parent === undefined) return undefined;

        const index = parent.children.indexOf(landsBeside) + 1;

        return { parentId: parent.id, index, lineBelowRowIndex: pointer.rowIndex, lineDepth };
    }

    // From the next row's depth, or 1 at the end of the list, up to the row's own depth.
    private depthBelowSubtreeEnd(entity: Entity, pointer: DropPointer) {
        const nextRow = this.entitiesRows.rows[pointer.rowIndex + 1];
        let shallowestDepth = 1;
        if (nextRow !== undefined) {
            shallowestDepth = Math.max(nextRow.depth, 1);
        }

        const deepestDepth = entity.depth;
        const atMostDeepest = Math.min(pointer.pointerDepth, deepestDepth);

        return Math.max(atMostDeepest, shallowestDepth);
    }

    // Refused: into a dragged entity or its children, the World dragged, or the camera anywhere but
    // directly inside the World.
    private allowsDrop(draggedIds: readonly EntityId[], parentId: EntityId) {
        const parent = this.level.requireEntity(parentId);

        for (const draggedId of draggedIds) {
            const dragged = this.level.requireEntity(draggedId);
            if (dragged === this.level.world) return false;

            const isIntoItself = dragged === parent || dragged.isAncestorOf(parent);
            if (isIntoItself) return false;

            const isCameraOutsideWorld = dragged === this.level.camera && parent !== this.level.world;
            if (isCameraOutsideWorld) return false;
        }

        return true;
    }
}

function placeFromFraction(heightFraction: number): PlaceInRow {
    if (heightFraction < ABOVE_BELOW_SHARE) return 'above';
    if (heightFraction > 1 - ABOVE_BELOW_SHARE) return 'below';

    return 'into';
}

// At the top of its children, folded or not; a folded group stays folded.
function targetInto(entity: Entity, rowIndex: number): DropTarget {
    return { parentId: entity.id, index: 0, lineBelowRowIndex: rowIndex, lineDepth: entity.depth + 1 };
}

function ancestorAtDepth(entity: Entity, depth: number) {
    let ancestor = entity;

    while (ancestor.depth > depth && ancestor.parent !== undefined) {
        ancestor = ancestor.parent;
    }

    return ancestor;
}
