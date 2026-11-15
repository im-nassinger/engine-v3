import type { Level } from '../../core/entities/index.ts';

import type { LevelChange } from './changes/index.ts';

// The changes of one command, applied as they are added so later code sees the level as it now is.
// Rolling back reverts them newest first, so a command is all or nothing.
export class EditTransaction {
    private readonly level: Level;
    private changes: LevelChange[] = [];

    constructor(level: Level) {
        this.level = level;
    }

    apply(change: LevelChange) {
        change.apply(this.level);
        this.changes.push(change);
    }

    get isEmpty() {
        return this.changes.length === 0;
    }

    rollback() {
        const newestFirst = [...this.changes].reverse();
        this.changes = [];

        for (const change of newestFirst) {
            change.revert(this.level);
        }
    }

    // Hands the changes over and leaves the transaction empty.
    takeChanges(): readonly LevelChange[] {
        const taken = this.changes;
        this.changes = [];

        return taken;
    }
}
