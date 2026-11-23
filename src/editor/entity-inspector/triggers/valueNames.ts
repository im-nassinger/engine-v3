import { cardTitle, TriggerComponent } from '../../../core/components/index.ts';
import type { ComponentRegistry } from '../../../core/components/index.ts';
import type { JsonValue, LiveValue, ReadableValue, ValueRef } from '../../../core/fields/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { triggerName } from '../../../core/triggers/index.ts';

// Between a component and one of its values in a word: "Transform › Position".
export const VALUE_SEPARATOR = ' › ';

// What Change value's value word reads: "coins", "Transform › Position", "tags", "Triggers › Touched". A
// vector's axis, which only a trigger made before vectors were added whole has, reads after it.
export function valueName(value: ValueRef, registry: ComponentRegistry, target: Entity | undefined) {
    switch (value.kind) {
        case 'variable':
            return value.name;
        case 'tag':
            return 'tags';
        case 'triggerOn':
            return `${cardTitle('TriggerComponent')}${VALUE_SEPARATOR}${triggerLabel(value.trigger, target)}`;
        case 'field': {
            const name = componentValueName(value, registry);
            if (value.axis === undefined) return name;

            return `${name} ${value.axis}`;
        }
    }
}

// What a live value reads in its submenu, its axis read apart: "Speed", "Velocity".
export const LIVE_LABELS: Readonly<Record<LiveValue, string>> = {
    speed: 'Speed',
    velocityX: 'Velocity',
    velocityY: 'Velocity',
};

// The axis of a vector a value reads, which the component value check shows as its own word; undefined
// for a number.
export function readableAxis(value: ReadableValue) {
    if (value.kind === 'field') return value.axis;
    if (value.live === 'velocityX') return 'x';
    if (value.live === 'velocityY') return 'y';

    return undefined;
}

// What the component value check's value word reads, its axis apart: "Transform › Position", "Body › Speed".
export function readableName(value: ReadableValue, registry: ComponentRegistry) {
    if (value.kind === 'field') return componentValueName(value, registry);

    const title = cardTitle('BodyComponent');
    return `${title}${VALUE_SEPARATOR}${LIVE_LABELS[value.live]}`;
}

// A field's label, as its component's submenu lists it: "Position", "Gravity scale".
export function fieldLabel(value: FieldValue, registry: ComponentRegistry) {
    const schema = registry.find(value.component)?.schema;

    return schema?.findField(value.field)?.label ?? value.field;
}

// A trigger's name as Change value lists it, or its id when the target no longer holds it.
export function triggerLabel(triggerId: number, target: Entity | undefined) {
    const triggers = target?.getComponent(TriggerComponent)?.get('triggers') ?? [];
    const trigger = triggers.find((candidate) => candidate.id === triggerId);
    if (trigger === undefined) return `trigger ${triggerId}`;

    return triggerName(trigger);
}

type FieldValue = (ValueRef | ReadableValue) & { readonly kind: 'field' };

function componentValueName(value: FieldValue, registry: ComponentRegistry) {
    const title = cardTitle(value.component);
    const label = fieldLabel(value, registry);

    return `${title}${VALUE_SEPARATOR}${label}`;
}

// What an amount reads as: a number, on or off, a tag, "100, 50" for a vector.
export function amountText(amount: JsonValue) {
    if (typeof amount === 'number') return String(amount);
    if (typeof amount === 'string') return amount;
    if (typeof amount === 'boolean') return amount ? 'on' : 'off';

    const isVector = isPointLike(amount);
    if (isVector) return `${amount.x}, ${amount.y}`;

    return 'a value';
}

export function isPointLike(amount: JsonValue | null): amount is { readonly x: number; readonly y: number } {
    if (typeof amount !== 'object' || amount === null) return false;
    if (!('x' in amount) || !('y' in amount)) return false;

    return typeof amount.x === 'number' && typeof amount.y === 'number';
}
