import { TagsComponent, TriggerComponent, VariablesComponent } from '../../../../src/core/components/index.ts';
import type {
    Action,
    ChangeOp,
    Check,
    JsonValue,
    Trigger,
    VariableValue,
    When,
} from '../../../../src/core/fields/index.ts';
import type { Entity, Level } from '../../../../src/core/level/index.ts';

// A trigger as the trigger card makes one, without its id or name, which giveTriggers adds.
export type TriggerParts = {
    readonly when: When;
    readonly checks?: readonly Check[];
    readonly actions: readonly Action[];
};

// The entity's triggers, with ids from 1 in list order, each named from its When.
export function giveTriggers(entity: Entity, parts: readonly TriggerParts[]) {
    const triggers: Trigger[] = parts.map((part, i) => ({
        id: i + 1,
        name: null,
        on: true,
        when: part.when,
        checks: part.checks ?? [],
        actions: part.actions,
    }));
    entity.addComponent(new TriggerComponent({ triggers, nextTriggerId: triggers.length + 1 }));

    return entity;
}

export function giveTags(entity: Entity, tags: readonly string[]) {
    entity.addComponent(new TagsComponent({ tags }));

    return entity;
}

// The World's variables, each starting at 0.
export function giveVariables(level: Level, names: readonly string[]) {
    level.world.addComponent(new VariablesComponent({ variables: names.map((name) => ({ name, value: 0 })) }));
}

export function entityTarget(entity: Entity) {
    return { kind: 'entity', entity: entity.id } as const;
}

export function changeVariable(level: Level, name: string, op: ChangeOp, amount: JsonValue | null): Action {
    return { kind: 'change', target: entityTarget(level.world), value: { kind: 'variable', name }, op, amount };
}

export function switchTrigger(owner: Entity, trigger: number, on: boolean): Action {
    return {
        kind: 'change',
        target: entityTarget(owner),
        value: { kind: 'triggerOn', trigger },
        op: 'set',
        amount: on,
    };
}

// Adds to the body's Body › Velocity, in px/s, whatever its mass.
export function addVelocity(entity: Entity, x: number, y: number): Action {
    return { kind: 'change', target: entityTarget(entity), value: { kind: 'velocity' }, op: 'add', amount: { x, y } };
}

export function inputHeld(input: string): When {
    return { kind: 'input', input, how: 'held' };
}

// An entity's own variables, each with its starting value.
export function giveOwnVariables(entity: Entity, values: Readonly<Record<string, VariableValue>>) {
    const variables = Object.entries(values).map(([name, value]) => ({ name, value }));
    entity.addComponent(new VariablesComponent({ variables }));

    return entity;
}

export function changeOwnVariable(name: string, op: ChangeOp, amount: JsonValue | null): Action {
    return { kind: 'change', target: { kind: 'this' }, value: { kind: 'variable', name, own: true }, op, amount };
}

export function fireAtTagged(tag: string, name: string): Action {
    return { kind: 'fire', target: { kind: 'tagged', tag }, name, amount: null };
}

export function wait(seconds: number): Action {
    return { kind: 'wait', seconds };
}

export function otherHasTag(tag: string): Check {
    return { kind: 'value', target: { kind: 'other' }, value: { kind: 'tag' }, compare: 'is', amount: tag };
}
