import type { EntityId } from '../../../core/level/index.ts';

// One visible row of the Entities panel. Its name, icon and eye are read from the entity itself.
export type EntitiesRow = {
    readonly entityId: EntityId;
    // The World is 0, an entity directly inside it 1.
    readonly depth: number;
    readonly hasChildren: boolean;
    readonly isFolded: boolean;
    // A parent's eye hides it: the row's own eye is drawn dimmed.
    readonly hiddenByParent: boolean;
};
