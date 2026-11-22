import type { Entity, EntityId, Level } from '../../../core/level/index.ts';

import type { EditorMessage } from './EditorMessage.ts';

// One small check of one entity. A new kind of message is a new rule in the list.
export type EditorMessageRule = {
    check(entity: Entity, level: Level): readonly EditorMessage[];
    // The other entities the check reads, by id: adding, removing or changing one checks this entity again,
    // since nothing about this entity itself changed.
    readsEntities?(entity: Entity, level: Level): readonly EntityId[];
};
