import { BodyComponent } from '../../components/index.ts';
import type { AnyComponentSchema, ComponentRegistry } from '../../components/index.ts';
import type { LiveValue, ReadableValue } from '../../fields/index.ts';
import type { Entity } from '../../level/index.ts';

const LIVE_VALUES: readonly LiveValue[] = ['speed', 'velocityX', 'velocityY'];

// What the component value check may read on a target, read from the schemas only, like changeableValues:
// every number field (an angle included, in degrees) and each axis of every vector field its components
// have, in card order, then, on a body, what it is doing now: its speed and velocity, read from physics.
// With no entity (`other`, or every entity with a tag), every registered component's values and the live
// ones.
export function readableValues(target: Entity | undefined, registry: ComponentRegistry) {
    const values: ReadableValue[] = [];

    if (target === undefined) {
        for (const componentClass of registry.inCardOrder()) {
            values.push(...numbersOf(componentClass.schema));
        }
        values.push(...liveValues());

        return values;
    }

    const components = [...target.components].sort((first, second) => first.schema.cardOrder - second.schema.cardOrder);
    for (const component of components) {
        values.push(...numbersOf(component.schema));
    }
    if (target.hasComponent(BodyComponent)) {
        values.push(...liveValues());
    }

    return values;
}

function numbersOf(schema: AnyComponentSchema) {
    const values: ReadableValue[] = [];

    for (const field of schema.fields) {
        const ref = { kind: 'field', component: schema.typeName, field: field.key } as const;
        const { kind } = field.type;

        if (kind === 'number' || kind === 'angle') {
            values.push(ref);
        } else if (kind === 'vector') {
            values.push({ ...ref, axis: 'x' }, { ...ref, axis: 'y' });
        }
    }

    return values;
}

function liveValues() {
    return LIVE_VALUES.map((live): ReadableValue => ({ kind: 'live', live }));
}

// The same value: the same field and axis, or the same live value.
export function sameReadableValue(first: ReadableValue, second: ReadableValue) {
    if (first.kind === 'live') return second.kind === 'live' && first.live === second.live;

    return (
        second.kind === 'field' &&
        first.component === second.component &&
        first.field === second.field &&
        first.axis === second.axis
    );
}
