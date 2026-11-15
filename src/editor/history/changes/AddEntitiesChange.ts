import type { Level } from '../../../core/entities/index.ts';

import type { LevelChange } from './LevelChange.ts';
import { SubtreeCopy } from './SubtreeCopy.ts';
import type { SubtreeCopyOptions } from './SubtreeCopy.ts';

// Create, paste, duplicate, and the new group of Group: the entities go in on apply and come out on revert.
export class AddEntitiesChange implements LevelChange {
    private readonly copy: SubtreeCopy;

    constructor(options: SubtreeCopyOptions) {
        this.copy = new SubtreeCopy(options);
    }

    apply(level: Level) {
        this.copy.put(level);
    }

    revert(level: Level) {
        this.copy.take(level);
    }
}
