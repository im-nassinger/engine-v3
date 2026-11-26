import type { TriggerParts } from '../../../determinism/build/triggerParts.ts';

import { addVelocity, ifVelocity, whenEvent } from './triggerBlocks.ts';
import type { Axis } from './triggerBlocks.ts';

// A trigger can only add to a velocity, and Set or Multiply would change both axes. These chains change
// one axis by an amount worked out from its value, by halving steps: each step is a trigger that checks
// the axis and adds its step, so the steps that run add up to the amount needed, to within the last step.
const STEP_COUNT = 12;

function halvingSteps(largest: number) {
    const steps: number[] = [];
    let step = largest;

    for (let i = 0; i < STEP_COUNT; i++) {
        steps.push(step);
        step = step / 2;
    }

    return steps;
}

function along(axis: Axis, amount: number) {
    if (axis === 'velocityX') return addVelocity(amount, 0);

    return addVelocity(0, amount);
}

// Brings the axis down to `limit` when it is above it, by up to twice `largestStep`.
export function capAbove(event: string, axis: Axis, limit: number, largestStep: number): TriggerParts[] {
    return halvingSteps(largestStep).map((step) => ({
        when: whenEvent(event),
        checks: [ifVelocity(axis, 'atLeast', limit + step)],
        actions: [along(axis, -step)],
    }));
}

// Brings the axis up to `limit` when it is below it.
export function capBelow(event: string, axis: Axis, limit: number, largestStep: number): TriggerParts[] {
    return halvingSteps(largestStep).map((step) => ({
        when: whenEvent(event),
        checks: [ifVelocity(axis, 'atMost', limit - step)],
        actions: [along(axis, step)],
    }));
}

// Takes up to `amount` off the axis's size, never past 0: a slowdown that stops dead instead of
// wobbling around 0.
export function slowTowardZero(event: string, axis: Axis, amount: number): TriggerParts[] {
    const largestStep = amount / 2;

    return [...capAbove(event, axis, 0, largestStep), ...capBelow(event, axis, 0, largestStep)];
}
