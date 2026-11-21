import { BodyComponent } from '../../../core/components/index.ts';
import type {
    AnyComponent,
    AnyComponentSchema,
    AnyFieldDefinition,
    ComponentValues,
    DerivedFieldDefinition,
} from '../../../core/components/index.ts';
import { NumberFieldType } from '../../../core/fields/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { BodyMass, mergesInto } from '../../../core/physics/index.ts';
import type { BodyMassCaches } from '../../../core/physics/index.ts';

import type { FieldModel, MassRow } from '../model/CardModel.ts';
import { isFixedOn } from '../rules/componentRules.ts';

import { sameOrMixed, sharedAxes, valuesOf } from './componentValues.ts';

// One component type on every shown entity, in the same order.
export type HeldComponents = {
    readonly schema: AnyComponentSchema;
    readonly entities: readonly Entity[];
    readonly components: readonly AnyComponent[];
};

const MASS_ROW: MassRow = {
    key: 'mass',
    label: 'Mass',
    description: 'How heavy the body is: its shapes’ area × density. Typing a mass sets the density for it.',
    unit: 'kg',
    type: new NumberFieldType({ min: 0 }),
};

// Masses worked out from densities set for one typed mass can differ in their last bits, so they count as
// the same when this close.
const SAME_MASS_SHARE = 1e-9;

// The card's fields: its own, then the derived ones, then the read-only rows.
export function fieldModels(held: HeldComponents, caches: BodyMassCaches) {
    const models: FieldModel[] = [];

    for (const field of held.schema.fields) {
        const model = storedFieldModel(held, field);
        models.push(model);
    }

    for (const derived of held.schema.derivedFields) {
        const model = derivedFieldModel(held, derived);
        if (model !== undefined) {
            models.push(model);
        }
    }

    const massRow = massRowModel(held, caches);
    if (massRow !== undefined) {
        models.push(massRow);
    }

    return models;
}

function storedFieldModel(held: HeldComponents, field: AnyFieldDefinition): FieldModel {
    const values = held.components.map((component) => component.readValue(field.key));
    const value = sharedValueOf(field, values);

    // Greyed only when it applies to none of them: typing a value still sets it on all.
    const isEnabled = held.components.some((component, i) => {
        const entity = held.entities[i] as Entity;

        return appliesTo(field, component) && !isGreyedByMerging(entity, held.schema, field);
    });

    return { kind: 'field', definition: field, value, isEnabled, isReadOnly: false };
}

function sharedValueOf(field: AnyFieldDefinition, values: readonly unknown[]) {
    if (field.type.kind === 'vector') return sharedAxes(values as Point[]);

    return sameOrMixed(values, (first, second) => field.type.equals(first, second));
}

function appliesTo(field: AnyFieldDefinition, component: AnyComponent) {
    if (field.appliesWhen === undefined) return true;

    const values = valuesOf(component);

    return field.appliesWhen(values);
}

// A body that merges into one above it isn't built in play, so its own settings do nothing but Merge.
function isGreyedByMerging(entity: Entity, schema: AnyComponentSchema, field: AnyFieldDefinition) {
    const isBodySetting = schema.typeName === BodyComponent.schema.typeName && field.key !== 'merge';
    if (!isBodySetting) return false;

    return mergesInto(entity) !== undefined;
}

// Hidden unless it applies to every shown entity: Radius means nothing on a rectangle.
function derivedFieldModel(
    held: HeldComponents,
    derived: DerivedFieldDefinition<ComponentValues, unknown>,
): FieldModel | undefined {
    const valuesPerComponent = held.components.map(valuesOf);
    const appliesToAll = valuesPerComponent.every((values) => derived.appliesWhen?.(values) ?? true);
    if (!appliesToAll) return undefined;

    const readValues = valuesPerComponent.map((values) => derived.read(values));
    const value = sameOrMixed(readValues, (first, second) => derived.type.equals(first, second));

    const hasWrite = derived.write !== undefined;
    const isFixedOnSomeEntity = held.entities.some((entity) => isFixedOn(entity, held.schema, derived.key));
    const isReadOnly = !hasWrite || isFixedOnSomeEntity;

    return { kind: 'derived', definition: derived, value, isEnabled: true, isReadOnly };
}

// Shown only when every shown entity is a Dynamic body with a mass of its own, not merged into another.
// Read-only when a body has no area, such as one with no surfaces or only lines: no density gives it a mass.
function massRowModel(held: HeldComponents, caches: BodyMassCaches): FieldModel | undefined {
    if (held.schema.typeName !== BodyComponent.schema.typeName) return undefined;

    const allDynamic = held.components.every((component) => component.readValue('type') === 'dynamic');
    if (!allDynamic) return undefined;

    const masses: number[] = [];
    let hasBodyWithoutArea = false;
    for (const entity of held.entities) {
        const mass = BodyMass.of(entity, caches);
        if (mass === undefined) return undefined;

        masses.push(mass.mass);
        hasBodyWithoutArea ||= mass.area === 0;
    }

    const value = sameOrMixed(masses, isSameMass);

    return { kind: 'mass', definition: MASS_ROW, value, isEnabled: true, isReadOnly: hasBodyWithoutArea };
}

function isSameMass(first: number, second: number) {
    const largest = Math.max(Math.abs(first), Math.abs(second));

    return Math.abs(first - second) <= largest * SAME_MASS_SHARE;
}
