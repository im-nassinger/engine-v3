import type { AnyComponent, ComponentTypeName, ComponentValues } from '../../../core/components/index.ts';
import type { Entity } from '../../../core/level/index.ts';

import { MIXED } from '../model/MIXED.ts';

export function componentOfType(entity: Entity, typeName: ComponentTypeName) {
    return entity.components.find((component) => component.schema.typeName === typeName);
}

// The component's values as one record, for a field's appliesWhen and a derived field's read.
export function valuesOf(component: AnyComponent) {
    const values: ComponentValues = {};

    for (const entry of component.schema.entries) {
        values[entry.key] = component.readValue(entry.key);
    }

    return values;
}

// The one value every entity holds, or MIXED. The Inspector always shows at least one entity.
export function sameOrMixed<T>(values: readonly T[], equals: (first: T, second: T) => boolean) {
    if (values.length === 0) {
        throw new Error('The Inspector shows at least one entity.');
    }

    const first = values[0] as T;
    const allSame = values.every((value) => equals(first, value));
    if (!allSame) return MIXED;

    return first;
}
