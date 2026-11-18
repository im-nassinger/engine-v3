import type { AnyComponent, ComponentTypeName } from '../../../core/components/index.ts';
import type { Entity, EntityId, Level } from '../../../core/level/index.ts';
import { SetValueChange } from '../../history/index.ts';

export type HeldComponent = {
    readonly entity: Entity;
    readonly component: AnyComponent;
};

// The given entities that hold a component of this type, in the order given.
export function holdersOf(level: Level, entityIds: readonly EntityId[], componentType: ComponentTypeName) {
    const holders: HeldComponent[] = [];

    for (const id of entityIds) {
        const entity = level.requireEntity(id);
        const component = entity.components.find((candidate) => candidate.schema.typeName === componentType);
        if (component === undefined) continue;

        holders.push({ entity, component });
    }

    return holders;
}

// A change for every value the edited copy holds differently, so an unchanged value makes none.
export function changesToMatch(held: HeldComponent, edited: AnyComponent) {
    const { entity, component } = held;
    const changes: SetValueChange[] = [];

    for (const entry of component.schema.entries) {
        const oldValue = component.readValue(entry.key);
        const newValue = edited.readValue(entry.key);
        if (entry.type.equals(oldValue, newValue)) continue;

        changes.push(
            new SetValueChange({ entityId: entity.id, schema: component.schema, key: entry.key, oldValue, newValue }),
        );
    }

    return changes;
}
