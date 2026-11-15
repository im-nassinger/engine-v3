import type { AnyComponentSchema, AnyValueEntry, ComponentTypeName } from '../../../core/components/index.ts';
import type { EntityId, Level } from '../../../core/level/index.ts';

import type { LevelChange } from './LevelChange.ts';
import { requireComponentByType } from './requireComponentByType.ts';
import { writeKnownValue } from './writeKnownValue.ts';

export type SetValueChangeOptions = {
    readonly entityId: EntityId;
    readonly schema: AnyComponentSchema;
    readonly key: string;
    readonly oldValue: unknown;
    readonly newValue: unknown;
};

// One field or stored value of one component. Both values are cloned, so later edits to the caller's
// objects never reach the history.
export class SetValueChange implements LevelChange {
    readonly entityId: EntityId;
    readonly componentType: ComponentTypeName;
    readonly key: string;
    private readonly schema: AnyComponentSchema;
    private readonly entry: AnyValueEntry;
    private readonly oldValue: unknown;
    private readonly newValue: unknown;

    constructor(options: SetValueChangeOptions) {
        const entry = options.schema.findEntry(options.key);
        if (entry === undefined) {
            throw new Error(`${options.schema.typeName} has no value ${options.key}.`);
        }

        this.entityId = options.entityId;
        this.componentType = options.schema.typeName;
        this.key = options.key;
        this.schema = options.schema;
        this.entry = entry;
        this.oldValue = entry.type.clone(options.oldValue);
        this.newValue = entry.type.clone(options.newValue);
    }

    apply(level: Level) {
        this.write(level, this.newValue);
    }

    revert(level: Level) {
        this.write(level, this.oldValue);
    }

    writesSameValueAs(other: SetValueChange) {
        const sameEntity = this.entityId === other.entityId;
        const sameComponent = this.componentType === other.componentType;

        return sameEntity && sameComponent && this.key === other.key;
    }

    // A joined run of edits to one value: from this change's old value to the later one's new value.
    joinedWith(later: SetValueChange) {
        if (!this.writesSameValueAs(later)) {
            throw new Error(`Only changes to the same value join: ${this.key} and ${later.key}.`);
        }

        return new SetValueChange({
            entityId: this.entityId,
            schema: this.schema,
            key: this.key,
            oldValue: this.oldValue,
            newValue: later.newValue,
        });
    }

    private write(level: Level, value: unknown) {
        const entity = level.requireEntity(this.entityId);
        const component = requireComponentByType(entity, this.componentType);

        writeKnownValue(component, this.entry, value);
    }
}
