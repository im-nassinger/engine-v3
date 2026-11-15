import type { AnyComponent, ComponentTypeName } from '../../../core/components/index.ts';
import type { EntityId, Level } from '../../../core/level/index.ts';

import { addCopy, removeByType } from './componentOnEntity.ts';
import type { ComponentChangeOptions } from './componentOnEntity.ts';
import type { LevelChange } from './LevelChange.ts';

// Add Component and a partner note's fix. The component is copied, so later edits to the caller's object
// never reach the history.
export class AddComponentChange implements LevelChange {
    readonly entityId: EntityId;
    readonly componentType: ComponentTypeName;
    private readonly component: AnyComponent;

    constructor(options: ComponentChangeOptions) {
        this.entityId = options.entityId;
        this.componentType = options.component.schema.typeName;
        this.component = options.component.copy();
    }

    apply(level: Level) {
        addCopy(level, this.entityId, this.component);
    }

    revert(level: Level) {
        removeByType(level, this.entityId, this.componentType);
    }
}
