import { VersionCounter } from '../events/index.ts';
import type { EntityId } from '../fields/index.ts';

const DEFAULT_GRID_SIZE = 100;
const MIN_GRID_SIZE = 5;
const MAX_GRID_SIZE = 1000;

// What only the editor reads, saved in level.json's `editor`: the grid size and the folded Entities panel
// rows. Neither folding nor changing the grid size is an undo step (owner, 2026-11-19).
export class LevelEditorData {
    static readonly minGridSize = MIN_GRID_SIZE;
    static readonly maxGridSize = MAX_GRID_SIZE;
    readonly version = new VersionCounter();
    private currentGridSize = DEFAULT_GRID_SIZE;
    private readonly foldedIds = new Set<EntityId>();

    get gridSize() {
        return this.currentGridSize;
    }

    // A whole number of pixels from 5 to 1,000. Returns the size actually kept.
    setGridSize(size: number) {
        const wholeSize = Math.round(size);
        const kept = Math.min(Math.max(wholeSize, MIN_GRID_SIZE), MAX_GRID_SIZE);
        if (kept === this.currentGridSize) return kept;

        this.currentGridSize = kept;
        this.version.increment();

        return kept;
    }

    isFolded(id: EntityId) {
        return this.foldedIds.has(id);
    }

    setFolded(id: EntityId, isFolded: boolean) {
        const wasFolded = this.foldedIds.has(id);
        if (wasFolded === isFolded) return;

        if (isFolded) {
            this.foldedIds.add(id);
        } else {
            this.foldedIds.delete(id);
        }

        this.version.increment();
    }

    // Lowest id first, so the same folds always write the same file.
    foldedRows() {
        const ids = [...this.foldedIds];
        ids.sort((first, second) => first - second);

        return ids;
    }
}
