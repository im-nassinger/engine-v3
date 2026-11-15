import type { AnyComponent, ComponentTypeName } from '../../../core/components/index.ts';
import type { EntityId, Level } from '../../../core/level/index.ts';

import { addCopy, removeByType } from './componentOnEntity.ts';
import type { ComponentChangeOptions } from './componentOnEntity.ts';
import type { LevelChange } from './LevelChange.ts';

// Remove on a card: only that component, its partners stay. Its values are copied before it goes, so undo
// gives them back exactly.
export class RemoveComponentChange implements LevelChange {
    readonly entityId: EntityId;
    readonly componentType: ComponentTypeName;
    private readonly component: AnyComponent;

    constructor(options: ComponentChangeOptions) {
        this.entityId = options.entityId;
        this.componentType = options.component.schema.typeName;
        this.component = options.component.copy();
    }

    apply(level: Level) {
        removeByType(level, this.entityId, this.componentType);
    }

    revert(level: Level) {
        addCopy(level, this.entityId, this.component);
    }
}
