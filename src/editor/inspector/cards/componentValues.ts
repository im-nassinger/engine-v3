import type { AnyComponent, ComponentTypeName, ComponentValues } from '../../../core/components/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import type { Entity } from '../../../core/level/index.ts';

import { MIXED } from '../model/MIXED.ts';
import type { MixedVector } from '../model/MixedVector.ts';

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

// A vector is never Mixed as a whole: each axis is shared or MIXED on its own, so typing one box keeps
// every entity's other axis.
export function sharedAxes(vectors: readonly Point[]): MixedVector {
    const xs = vectors.map((vector) => vector.x);
    const ys = vectors.map((vector) => vector.y);
    const x = sameOrMixed(xs, (first, second) => first === second);
    const y = sameOrMixed(ys, (first, second) => first === second);

    return { x, y };
}
