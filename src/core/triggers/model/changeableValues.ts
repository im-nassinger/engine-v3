import { TriggerComponent, VariablesComponent } from '../../components/index.ts';
import type { AnyComponentSchema, AnyFieldDefinition, ComponentRegistry } from '../../components/index.ts';
import { CheckboxFieldType, ListFieldType, NumberFieldType, TextFieldType } from '../../fields/index.ts';
import type { ChangeOp, ValueRef, ValueType } from '../../fields/index.ts';
import type { Entity } from '../../level/index.ts';

// One value Change value may offer for a target: which value, the ways it may change, and the type its
// amount is read with.
export type ChangeableValue = {
    readonly ref: ValueRef;
    readonly ops: readonly ChangeOp[];
    readonly amountType: ValueType<unknown>;
};

const SET_ONLY: readonly ChangeOp[] = ['set'];
const ADD_OR_SUBTRACT: readonly ChangeOp[] = ['add', 'subtract'];
const EVERY_OP: readonly ChangeOp[] = ['set', 'add', 'subtract'];

const NUMBER_AMOUNT = new NumberFieldType();
const ON_AMOUNT = new CheckboxFieldType();
const TAG_AMOUNT = new TextFieldType({ minLength: 1, trimmed: true });

// What Change value may offer for a target, read from the schemas only, so a component added later is offered
// with no trigger code: every field marked changeableInPlay, a vector whole for Set and by axis for Add and
// Subtract, the tag to add or remove, and, on an entity known while editing, its variables and each of its
// triggers' on/off. With no entity (`other`, or every entity with a tag), every registered component's fields.
export function changeableValues(target: Entity | undefined, registry: ComponentRegistry) {
    const values: ChangeableValue[] = [];

    if (target === undefined) {
        for (const componentClass of registry.inCardOrder()) {
            values.push(...fieldValuesOf(componentClass.schema));
        }

        return values;
    }

    const components = [...target.components].sort((first, second) => first.schema.cardOrder - second.schema.cardOrder);
    for (const component of components) {
        values.push(...fieldValuesOf(component.schema));
    }

    values.push(...variableValuesOf(target), ...triggerValuesOf(target));

    return values;
}

function fieldValuesOf(schema: AnyComponentSchema) {
    const values: ChangeableValue[] = [];

    for (const field of schema.fields) {
        if (!field.changeableInPlay) continue;

        values.push(...valuesOfField(schema, field));
    }

    return values;
}

// A list is changed item by item (variables, triggers), so it is offered by the entity, never whole.
function valuesOfField(schema: AnyComponentSchema, field: AnyFieldDefinition): readonly ChangeableValue[] {
    const { kind } = field.type;
    if (kind === 'list' || field.type instanceof ListFieldType) return [];
    if (kind === 'tags') return [{ ref: { kind: 'tag' }, ops: ADD_OR_SUBTRACT, amountType: TAG_AMOUNT }];

    const ref = { kind: 'field', component: schema.typeName, field: field.key } as const;
    if (kind === 'number' || kind === 'angle') return [{ ref, ops: EVERY_OP, amountType: field.type }];
    if (kind !== 'vector') return [{ ref, ops: SET_ONLY, amountType: field.type }];

    return [
        { ref, ops: SET_ONLY, amountType: field.type },
        { ref: { ...ref, axis: 'x' }, ops: ADD_OR_SUBTRACT, amountType: NUMBER_AMOUNT },
        { ref: { ...ref, axis: 'y' }, ops: ADD_OR_SUBTRACT, amountType: NUMBER_AMOUNT },
    ];
}

function variableValuesOf(target: Entity): readonly ChangeableValue[] {
    const variables = target.getComponent(VariablesComponent)?.get('variables') ?? [];

    return variables.map((variable) => ({
        ref: { kind: 'variable', name: variable.name },
        ops: EVERY_OP,
        amountType: NUMBER_AMOUNT,
    }));
}

function triggerValuesOf(target: Entity): readonly ChangeableValue[] {
    const triggers = target.getComponent(TriggerComponent)?.get('triggers') ?? [];

    return triggers.map((trigger) => ({
        ref: { kind: 'triggerOn', trigger: trigger.id },
        ops: SET_ONLY,
        amountType: ON_AMOUNT,
    }));
}

// The same value: the same kind and the same names, axis included.
export function sameValueRef(first: ValueRef, second: ValueRef) {
    switch (first.kind) {
        case 'variable':
            return second.kind === 'variable' && first.name === second.name;
        case 'field':
            return (
                second.kind === 'field' &&
                first.component === second.component &&
                first.field === second.field &&
                first.axis === second.axis
            );
        case 'tag':
            return second.kind === 'tag';
        case 'triggerOn':
            return second.kind === 'triggerOn' && first.trigger === second.trigger;
    }
}
