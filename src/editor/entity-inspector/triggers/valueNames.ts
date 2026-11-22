import { cardTitle, TriggerComponent } from '../../../core/components/index.ts';
import type { ComponentRegistry } from '../../../core/components/index.ts';
import type { JsonValue, ValueRef } from '../../../core/fields/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { triggerName } from '../../../core/triggers/index.ts';

// What Change value's value word reads: "coins", "Transform position x", "tags", `trigger "Touched" on`.
export function valueName(value: ValueRef, registry: ComponentRegistry, target: Entity | undefined) {
    switch (value.kind) {
        case 'variable':
            return value.name;
        case 'tag':
            return 'tags';
        case 'triggerOn':
            return triggerOnName(value.trigger, target);
        case 'field':
            return fieldName(value, registry);
    }
}

function triggerOnName(triggerId: number, target: Entity | undefined) {
    const triggers = target?.getComponent(TriggerComponent)?.get('triggers') ?? [];
    const trigger = triggers.find((candidate) => candidate.id === triggerId);
    if (trigger === undefined) return `trigger ${triggerId} on`;

    const name = triggerName(trigger);
    return `trigger "${name}" on`;
}

function fieldName(value: ValueRef & { readonly kind: 'field' }, registry: ComponentRegistry) {
    const title = cardTitle(value.component);
    const schema = registry.find(value.component)?.schema;
    const label = schema?.findField(value.field)?.label ?? value.field;
    const lowerLabel = label.toLowerCase();
    if (value.axis === undefined) return `${title} ${lowerLabel}`;

    return `${title} ${lowerLabel} ${value.axis}`;
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

function isPointLike(amount: JsonValue): amount is { readonly x: number; readonly y: number } {
    if (typeof amount !== 'object' || amount === null) return false;
    if (!('x' in amount) || !('y' in amount)) return false;

    return typeof amount.x === 'number' && typeof amount.y === 'number';
}
