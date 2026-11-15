import type { EntityId, Level, SwitchName } from '../../../core/entities/index.ts';

import type { LevelChange } from './LevelChange.ts';

// An entity's own eye or lock.
export class SetSwitchChange implements LevelChange {
    readonly entityId: EntityId;
    readonly switchName: SwitchName;
    private readonly oldValue: boolean;
    private readonly newValue: boolean;

    constructor(entityId: EntityId, switchName: SwitchName, oldValue: boolean, newValue: boolean) {
        this.entityId = entityId;
        this.switchName = switchName;
        this.oldValue = oldValue;
        this.newValue = newValue;
    }

    apply(level: Level) {
        this.write(level, this.newValue);
    }

    revert(level: Level) {
        this.write(level, this.oldValue);
    }

    private write(level: Level, value: boolean) {
        const entity = level.requireEntity(this.entityId);

        if (this.switchName === 'hidden') {
            entity.setHidden(value);
            return;
        }

        entity.setLocked(value);
    }
}
