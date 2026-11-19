import type { Level } from '../../../core/level/index.ts';

import type { LevelChange } from './LevelChange.ts';

// The level's grid size, saved in its file. Both sizes were kept by the level before, so they stay as they are.
export class SetGridSizeChange implements LevelChange {
    private readonly oldSize: number;
    private readonly newSize: number;

    constructor(oldSize: number, newSize: number) {
        this.oldSize = oldSize;
        this.newSize = newSize;
    }

    apply(level: Level) {
        level.editorData.setGridSize(this.newSize);
    }

    revert(level: Level) {
        level.editorData.setGridSize(this.oldSize);
    }
}
