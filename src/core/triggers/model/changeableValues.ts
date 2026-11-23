import { TriggerComponent, VariablesComponent } from '../../components/index.ts';
import type { AnyComponentSchema, AnyFieldDefinition, ComponentRegistry } from '../../components/index.ts';
import {
    CheckboxFieldType,
    ListFieldType,
    MAX_STRING_VARIABLE_LENGTH,
    NumberFieldType,
    TextFieldType,
} from '../../fields/index.ts';
import type { ChangeOp, Unit, ValueRef, ValueType, VariableType } from '../../fields/index.ts';
import { variableTypeOf } from '../../fields/index.ts';
import type { Entity } from '../../level/index.ts';

// One value Change value may offer for a target: which value, the ways it may change, and the type its
// amount is read with.
export type ChangeableValue = {
    readonly ref: ValueRef;
    readonly ops: readonly ChangeOp[];
    readonly amountType: ValueType<unknown>;
    // The field's unit, such as px for Position; undefined for none.
    readonly unit?: Unit;
};

const SET_ONLY: readonly ChangeOp[] = ['set'];
const ADD_OR_SUBTRACT: readonly ChangeOp[] = ['add', 'subtract'];
const EVERY_OP: readonly ChangeOp[] = ['set', 'add', 'subtract'];
const SET_OR_FLIP: readonly ChangeOp[] = ['set', 'flip'];

const NUMBER_AMOUNT = new NumberFieldType();
const ON_AMOUNT = new CheckboxFieldType();
const TAG_AMOUNT = new TextFieldType({ minLength: 1, trimmed: true });
const STRING_AMOUNT = new TextFieldType({ maxLength: MAX_STRING_VARIABLE_LENGTH });

// What each type of variable may do, and what its amount is read with. Flip needs no amount, but the
// trigger still holds one, so a boolean's is read as a boolean.
const VARIABLE_OFFERS: Readonly<Record<VariableType, Omit<ChangeableValue, 'ref'>>> = {
    number: { ops: EVERY_OP, amountType: NUMBER_AMOUNT },
    string: { ops: SET_ONLY, amountType: STRING_AMOUNT },
    boolean: { ops: SET_OR_FLIP, amountType: ON_AMOUNT },
};

// What Change value may offer for a target, read from the schemas only, so a component added later is offered
// with no trigger code: every field marked changeableInPlay, a vector whole for Set, Add and Subtract, the tag to add or remove, and, on an entity known while editing, its variables with the ops their
// type allows and each of its triggers' on/off. The World's variables are the level's, named as v3 named
// them; any other entity's are its own (`own: true`). With no entity (`other`, or every entity with a tag),
// every registered component's fields.
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
    const isAddable = kind === 'number' || kind === 'angle' || kind === 'vector';
    const ops = isAddable ? EVERY_OP : SET_ONLY;
    if (field.unit === undefined) return [{ ref, ops, amountType: field.type }];

    return [{ ref, ops, amountType: field.type, unit: field.unit }];
}

function variableValuesOf(target: Entity): readonly ChangeableValue[] {
    const variables = target.getComponent(VariablesComponent)?.get('variables') ?? [];

    // The World is the one entity with no parent.
    const isWorld = target.parent === undefined;

    return variables.map((variable): ChangeableValue => {
        const ref: ValueRef = isWorld
            ? { kind: 'variable', name: variable.name }
            : { kind: 'variable', name: variable.name, own: true };

        const type = variableTypeOf(variable.value);
        return { ref, ...variableChangeOf(type) };
    });
}

// The ways a variable of this type may change, and what its amount is read with.
export function variableChangeOf(type: VariableType) {
    return VARIABLE_OFFERS[type];
}

function triggerValuesOf(target: Entity): readonly ChangeableValue[] {
    const triggers = target.getComponent(TriggerComponent)?.get('triggers') ?? [];

    return triggers.map((trigger) => ({
        ref: { kind: 'triggerOn', trigger: trigger.id },
        ops: SET_ONLY,
        amountType: ON_AMOUNT,
    }));
}

// The same value: the same kind and the same names, axis and owner included.
export function sameValueRef(first: ValueRef, second: ValueRef) {
    switch (first.kind) {
        case 'variable':
            return second.kind === 'variable' && first.name === second.name && first.own === second.own;
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
