import { ShapeComponent, TransformComponent } from '../../../core/components/index.ts';
import type { AnyComponent, ComponentTypeName } from '../../../core/components/index.ts';
import type { ParseOutcome } from '../../../core/fields/index.ts';
import { convertShape, Matrix2D } from '../../../core/geometry/index.ts';
import type { Point, ShapeKind } from '../../../core/geometry/index.ts';
import type { EntityId } from '../../../core/level/index.ts';
import { SetValueChange } from '../../history/index.ts';
import type { EditOutcome, LevelChange } from '../../history/index.ts';
import type { OpenLevel } from '../../session/index.ts';

import { changesToMatch, holdersOf } from './componentEdits.ts';
import type { HeldComponent } from './componentEdits.ts';
import { problemText } from './problemText.ts';

// The box of a vector field being typed in.
export type Axis = 'x' | 'y';

type EditedField = {
    readonly label: string;
    readonly isDerived: boolean;
};

// The Entity inspector's edit of one field on every given entity that has the component, as one step labelled
// "Change Linear damping". A derived field goes through its write. A value any entity refuses gives the
// reason and no step; a value every entity already holds makes no step. Changing Kind also moves each
// shape's TransformComponent by convertShape's offset, so the shape stays in place.
export function setFieldValue(
    openLevel: OpenLevel,
    entityIds: readonly EntityId[],
    componentType: ComponentTypeName,
    key: string,
    value: unknown,
): EditOutcome {
    return editEach(openLevel, entityIds, componentType, key, () => value);
}

// A value made from each entity's own, as one step: the Fill's choice switches each selected entity's fill
// from what it holds, so Solid to Linear keeps each one's colour. Refused like setFieldValue.
export function setFieldValueEach(
    openLevel: OpenLevel,
    entityIds: readonly EntityId[],
    componentType: ComponentTypeName,
    key: string,
    valueFor: (value: unknown) => unknown,
): EditOutcome {
    return editEach(openLevel, entityIds, componentType, key, (held) => valueFor(held.component.readValue(key)));
}

// One box of a vector field: the typed axis on every entity, each keeping its own other axis, so a
// Position whose y is Mixed can have its x typed. One step, refused like setFieldValue.
export function setVectorAxis(
    openLevel: OpenLevel,
    entityIds: readonly EntityId[],
    componentType: ComponentTypeName,
    key: string,
    axis: Axis,
    value: number,
): EditOutcome {
    const withAxis = (held: HeldComponent) => {
        const vector = held.component.readValue(key) as Point;

        return { ...vector, [axis]: value };
    };

    return editEach(openLevel, entityIds, componentType, key, withAxis);
}

function editEach(
    openLevel: OpenLevel,
    entityIds: readonly EntityId[],
    componentType: ComponentTypeName,
    key: string,
    valueFor: (held: HeldComponent) => unknown,
): EditOutcome {
    const { level, editor } = openLevel;
    const holders = holdersOf(level, entityIds, componentType);
    const firstHolder = holders[0];
    if (firstHolder === undefined) return { kind: 'done' };

    const field = editedField(firstHolder.component, key);
    const changes: LevelChange[] = [];

    for (const held of holders) {
        const value = valueFor(held);
        const edited = held.component.copy();
        const written = writeInto(edited, field, key, value);
        if (!written.ok) {
            const reason = problemText(field.label, written.problem);
            return { kind: 'refused', reason };
        }

        const valueChanges = changesToMatch(held, edited);
        changes.push(...valueChanges);

        const movesShape = isKindChange(componentType, key) && valueChanges.length > 0;
        if (movesShape) {
            const offsetChanges = kindOffsetChanges(held, value as ShapeKind);
            changes.push(...offsetChanges);
        }
    }

    if (changes.length === 0) return { kind: 'done' };

    return editor.edit(`Change ${field.label}`, (transaction) => {
        for (const change of changes) {
            transaction.apply(change);
        }

        return { kind: 'done' };
    });
}

function editedField(component: AnyComponent, key: string): EditedField {
    const stored = component.schema.findField(key);
    if (stored !== undefined) return { label: stored.label, isDerived: false };

    const derived = component.schema.findDerivedField(key);
    if (derived !== undefined) return { label: derived.label, isDerived: true };

    throw new Error(`${component.schema.typeName} has no field ${key}.`);
}

// Through the file form, the one path that parses every value type, as undo writes values back.
function writeInto(component: AnyComponent, field: EditedField, key: string, value: unknown): ParseOutcome<unknown> {
    if (!field.isDerived) {
        const entry = component.schema.findEntry(key);
        if (entry === undefined) throw new Error(`${component.schema.typeName} has no value ${key}.`);

        return component.writeValue(key, entry.type.serialize(value));
    }

    const derived = component.schema.findDerivedField(key);
    if (derived === undefined) throw new Error(`${component.schema.typeName} has no derived field ${key}.`);

    return component.writeDerived(key, derived.type.serialize(value));
}

function isKindChange(componentType: ComponentTypeName, key: string) {
    return componentType === ShapeComponent.schema.typeName && key === 'kind';
}

// The offset is in the shape's own space, so the TransformComponent's matrix turns it into the new Position.
function kindOffsetChanges(held: HeldComponent, kind: ShapeKind): SetValueChange[] {
    const { entity } = held;
    const geometry = entity.requireComponent(ShapeComponent).get('geometry');
    const converted = convertShape(geometry, kind);
    if (!converted.ok) throw new Error(`Kind was written but ${kind} can't be made from this shape.`);

    const offset = converted.value.offset;
    if (offset.x === 0 && offset.y === 0) return [];

    const transform = entity.requireComponent(TransformComponent);
    const oldPosition = transform.get('position');
    const matrix = Matrix2D.fromTransform({
        position: oldPosition,
        rotation: transform.get('rotation'),
        scale: transform.get('scale'),
        skew: transform.get('skew'),
    });
    const newPosition = matrix.apply(offset);

    const change = new SetValueChange({
        entityId: entity.id,
        schema: TransformComponent.schema,
        key: 'position',
        oldValue: oldPosition,
        newValue: newPosition,
    });

    return [change];
}
