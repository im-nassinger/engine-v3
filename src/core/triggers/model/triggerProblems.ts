import { InputComponent, VariablesComponent } from '../../components/index.ts';
import type { ComponentRegistry } from '../../components/index.ts';
import type { Action, Check, Target, Trigger, ValueRef, When } from '../../fields/index.ts';
import type { Entity, Level } from '../../level/index.ts';

import { changeableValues, sameValueRef } from './changeableValues.ts';

// Where in a trigger a problem is: its When, or one check or action by its place in the list.
export type TriggerPart =
    | { readonly section: 'when' }
    | { readonly section: 'check'; readonly index: number }
    | { readonly section: 'action'; readonly index: number };

// The word of the part's sentence the problem is on.
export type TriggerSlot =
    'event' | 'input' | 'key' | 'seconds' | 'tag' | 'target' | 'variable' | 'number' | 'value' | 'amount' | 'push';

// Reasons, never sentences: the editor writes what the user reads.
export type TriggerProblemReason =
    | 'unset'
    // `other` under an event that has none: a key, a timer, level start, a tag running out.
    | 'noOther'
    | 'unknownInput'
    | 'unknownVariable'
    // A value the target can't change this way, such as Add on a colour, or a component it doesn't have.
    | 'unknownValue'
    // An amount the value's type refuses, such as a word for a number.
    | 'badAmount'
    | 'missingEntity'
    | 'missingTrigger';

export type TriggerProblem = {
    readonly part: TriggerPart;
    readonly slot: TriggerSlot;
    readonly reason: TriggerProblemReason;
};

// What a trigger is checked against: the entity holding it, its level and the components there are.
export type TriggerContext = {
    readonly owner: Entity;
    readonly level: Level;
    readonly registry: ComponentRegistry;
};

const WHEN: TriggerPart = { section: 'when' };

// What stops a trigger running, part by part. The Entity inspector and the game both read it, so a part
// shown yellow is a part that doesn't run. A missing entity or trigger only skips its own check or action;
// every other problem stops the whole trigger (stopsTrigger).
export function triggerProblems(trigger: Trigger, context: TriggerContext) {
    const problems: TriggerProblem[] = [...whenProblems(trigger.when, context)];
    const hasOther = eventHasOther(trigger.when);

    trigger.checks.forEach((check, index) => {
        const part: TriggerPart = { section: 'check', index };
        problems.push(...checkProblems(check, part, hasOther, context));
    });

    trigger.actions.forEach((action, index) => {
        const part: TriggerPart = { section: 'action', index };
        problems.push(...actionProblems(action, part, hasOther, context));
    });

    return problems;
}

export function stopsTrigger(problem: TriggerProblem) {
    return problem.reason !== 'missingEntity' && problem.reason !== 'missingTrigger';
}

export function triggerCanRun(problems: readonly TriggerProblem[]) {
    return !problems.some(stopsTrigger);
}

// Only touching names an `other` in v3. An unset When says nothing yet, so it greys nothing.
function eventHasOther(when: When | null) {
    if (when === null) return true;

    return when.kind === 'touched' || when.kind === 'untouched';
}

function whenProblems(when: When | null, context: TriggerContext): readonly TriggerProblem[] {
    if (when === null) return [{ part: WHEN, slot: 'event', reason: 'unset' }];

    switch (when.kind) {
        case 'input':
            if (when.input === null) return [{ part: WHEN, slot: 'input', reason: 'unset' }];
            if (!worldHasInput(context.level, when.input)) {
                return [{ part: WHEN, slot: 'input', reason: 'unknownInput' }];
            }

            return [];
        case 'key':
            if (when.key === null) return [{ part: WHEN, slot: 'key', reason: 'unset' }];

            return [];
        case 'after':
        case 'every':
            if (when.seconds === null) return [{ part: WHEN, slot: 'seconds', reason: 'unset' }];

            return [];
        case 'tagLeft':
            if (when.tag === null) return [{ part: WHEN, slot: 'tag', reason: 'unset' }];

            return [];
        default:
            return [];
    }
}

function checkProblems(check: Check, part: TriggerPart, hasOther: boolean, context: TriggerContext) {
    const problems: TriggerProblem[] = [];

    if (check.kind === 'hasTag') {
        problems.push(...targetProblems(check.target, part, hasOther, context));
        if (check.tag === null) {
            problems.push({ part, slot: 'tag', reason: 'unset' });
        }

        return problems;
    }

    if (check.variable === null) {
        problems.push({ part, slot: 'variable', reason: 'unset' });
    } else if (!worldHasVariable(context.level, check.variable)) {
        problems.push({ part, slot: 'variable', reason: 'unknownVariable' });
    }

    if (check.value === null) {
        problems.push({ part, slot: 'number', reason: 'unset' });
    }

    return problems;
}

function actionProblems(action: Action, part: TriggerPart, hasOther: boolean, context: TriggerContext) {
    switch (action.kind) {
        case 'change':
            return [
                ...targetProblems(action.target, part, hasOther, context),
                ...changeProblems(action, part, context),
            ];
        case 'destroy':
            return targetProblems(action.target, part, hasOther, context);
        case 'push': {
            const problems = [...targetProblems(action.target, part, hasOther, context)];
            if (action.push === null) {
                problems.push({ part, slot: 'push', reason: 'unset' });
            }

            return problems;
        }
        default:
            return [];
    }
}

function targetProblems(
    target: Target,
    part: TriggerPart,
    hasOther: boolean,
    context: TriggerContext,
): readonly TriggerProblem[] {
    switch (target.kind) {
        case 'this':
            return [];
        case 'other':
            if (!hasOther) return [{ part, slot: 'target', reason: 'noOther' }];

            return [];
        case 'entity':
            if (target.entity === null) return [{ part, slot: 'target', reason: 'unset' }];
            if (context.level.findEntity(target.entity) === undefined) {
                return [{ part, slot: 'target', reason: 'missingEntity' }];
            }

            return [];
        case 'tagged':
            if (target.tag === null) return [{ part, slot: 'target', reason: 'unset' }];

            return [];
    }
}

type ChangeAction = Action & { readonly kind: 'change' };

function changeProblems(action: ChangeAction, part: TriggerPart, context: TriggerContext) {
    const problems: TriggerProblem[] = [];
    const { value } = action;

    if (value === null) {
        problems.push({ part, slot: 'value', reason: 'unset' });
    } else {
        problems.push(...valueProblems(action, value, part, context));
    }

    if (action.amount === null) {
        problems.push({ part, slot: 'amount', reason: 'unset' });
    }

    return problems;
}

// The value checked against what the target offers. A target only known in play (`other`, a tag, a missing
// entity) can't be checked for its variables or triggers: in play, a target that lacks them is skipped.
function valueProblems(
    action: ChangeAction,
    value: ValueRef,
    part: TriggerPart,
    context: TriggerContext,
): readonly TriggerProblem[] {
    const target = knownTarget(action.target, context);
    const isPerEntity = value.kind === 'variable' || value.kind === 'triggerOn';
    if (target === undefined && isPerEntity) return [];

    const offers = changeableValues(target, context.registry);
    const offer = offers.find((candidate) => sameValueRef(candidate.ref, value));
    if (offer === undefined) return [{ part, slot: 'value', reason: missingValueReason(value) }];
    if (!offer.ops.includes(action.op)) return [{ part, slot: 'value', reason: 'unknownValue' }];
    if (action.amount === null) return [];

    const amount = offer.amountType.parse(action.amount);
    if (!amount.ok) return [{ part, slot: 'amount', reason: 'badAmount' }];

    return [];
}

function missingValueReason(value: ValueRef) {
    if (value.kind === 'variable') return 'unknownVariable';
    if (value.kind === 'triggerOn') return 'missingTrigger';

    return 'unknownValue';
}

// The entity a target names while editing: the trigger's own, or one by its id that is still there.
function knownTarget(target: Target, context: TriggerContext) {
    if (target.kind === 'this') return context.owner;
    if (target.kind !== 'entity' || target.entity === null) return undefined;

    return context.level.findEntity(target.entity);
}

function worldHasVariable(level: Level, name: string) {
    const variables = level.world.getComponent(VariablesComponent)?.get('variables') ?? [];

    return variables.some((variable) => variable.name === name);
}

function worldHasInput(level: Level, name: string) {
    const inputs = level.world.getComponent(InputComponent)?.get('inputs') ?? [];

    return inputs.some((input) => input.name === name);
}
