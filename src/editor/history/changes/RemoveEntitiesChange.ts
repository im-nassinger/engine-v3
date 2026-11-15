import type { Entity, Level } from '../../../core/level/index.ts';
import { LevelWriter } from '../../../core/level-data/index.ts';
import type { LevelReader } from '../../../core/level-data/index.ts';

import type { LevelChange } from './LevelChange.ts';
import { placeOf, SubtreeCopy } from './SubtreeCopy.ts';
import type { SubtreeCopyOptions } from './SubtreeCopy.ts';

// Delete, cut, and the group of Ungroup: the entities come out on apply and go back on revert, with their
// ids, values and switches.
export class RemoveEntitiesChange implements LevelChange {
    private readonly copy: SubtreeCopy;

    constructor(options: SubtreeCopyOptions) {
        this.copy = new SubtreeCopy(options);
    }

    // One entity with everything inside it, read before it is removed.
    static ofEntity(reader: LevelReader, entity: Entity) {
        const entities = new LevelWriter().writeSubtree([entity]);

        return new RemoveEntitiesChange({ reader, entities, place: placeOf(entity) });
    }

    apply(level: Level) {
        this.copy.take(level);
    }

    revert(level: Level) {
        this.copy.put(level);
    }
}
