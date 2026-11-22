import type { AnyComponent, ComponentClass } from '../../../core/components/index.ts';
import type { JsonValue } from '../../../core/fields/index.ts';
import type { EntityId } from '../../../core/level/index.ts';
import { AddComponentChange } from '../../history/index.ts';
import type { EditOutcome } from '../../history/index.ts';
import type { OpenLevel } from '../../session/index.ts';

// Add Component and a note's fix: the component with its defaults, or with the fix's values written over
// them (a Surface with Sensor ticked), only on the given entities that lack it, as one step labelled
// "Add BodyComponent". Whether a component may be added at all is the Entity inspector's rule, given with
// its reason before this is called.
export function addComponent(
    openLevel: OpenLevel,
    entityIds: readonly EntityId[],
    componentClass: ComponentClass<AnyComponent>,
    savedValues: Readonly<Record<string, JsonValue>> = {},
): EditOutcome {
    const { level, editor } = openLevel;
    const lacking = entityIds
        .map((id) => level.requireEntity(id))
        .filter((entity) => !entity.hasComponent(componentClass));
    if (lacking.length === 0) return { kind: 'done' };

    const changes = lacking.map((entity) => {
        const component = componentWith(componentClass, savedValues);

        return new AddComponentChange({ entityId: entity.id, component });
    });

    return editor.edit(`Add ${componentClass.schema.typeName}`, (transaction) => {
        for (const change of changes) {
            transaction.apply(change);
        }

        return { kind: 'done' };
    });
}

function componentWith(componentClass: ComponentClass<AnyComponent>, savedValues: Readonly<Record<string, JsonValue>>) {
    const component = new componentClass();

    for (const [key, raw] of Object.entries(savedValues)) {
        const written = component.writeValue(key, raw);
        if (!written.ok) throw new Error(`${componentClass.schema.typeName} refused ${key}.`);
    }

    return component;
}
