import { describe, expect, test } from 'vitest';

import { TriggerComponent } from '../../components/index.ts';
import type { Trigger } from '../../fields/index.ts';

import { newTriggerId } from './newTriggerId.ts';

function trigger(id: number): Trigger {
    return { id, name: null, on: true, when: null, checks: [], actions: [], repeat: { kind: 'everyTime' } };
}

describe('newTriggerId', () => {
    test('a new component gives 1', () => {
        expect(newTriggerId(new TriggerComponent())).toBe(1);
    });

    test('an id given before is never given again, even once its trigger is deleted', () => {
        const component = new TriggerComponent({ triggers: [trigger(1)], nextTriggerId: 4 });

        expect(newTriggerId(component)).toBe(4);
    });

    test('an id above the stored next one, from damaged or hand-made data, is stepped over', () => {
        const component = new TriggerComponent({ triggers: [trigger(9), trigger(2)], nextTriggerId: 3 });

        expect(newTriggerId(component)).toBe(10);
    });
});
