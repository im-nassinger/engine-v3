import { describe, expect, test } from 'vitest';

import { TriggerComponent } from '../../components/index.ts';
import type { Action, Trigger, When } from '../../fields/index.ts';
import { Level } from '../../level/index.ts';

import { CustomEventNames } from './CustomEventNames.ts';

function trigger(id: number, when: When | null, actions: readonly Action[] = []): Trigger {
    return { id, name: null, on: true, when, checks: [], actions, repeat: { kind: 'everyTime' } };
}

function fire(name: string | null): Action {
    return { kind: 'fire', target: { kind: 'tagged', tag: 'door' }, name, amount: null };
}

describe('CustomEventNames', () => {
    test('lists every name heard in a When or fired in the level once, A to Z, unset names left out', () => {
        const level = Level.createNew();
        const button = level.createEntity(level.world, 0);
        button.addComponent(
            new TriggerComponent({
                triggers: [trigger(1, { kind: 'touched' }, [fire('open'), fire(null), fire('ring')])],
                nextTriggerId: 2,
            }),
        );
        const door = level.createEntity(level.world, 1);
        door.addComponent(
            new TriggerComponent({
                triggers: [trigger(1, { kind: 'custom', name: 'open' }), trigger(2, { kind: 'custom', name: null })],
                nextTriggerId: 3,
            }),
        );
        level.world.addComponent(
            new TriggerComponent({ triggers: [trigger(1, { kind: 'custom', name: 'close' })], nextTriggerId: 2 }),
        );

        expect(CustomEventNames.of(level)).toEqual(['close', 'open', 'ring']);
    });

    test('is empty in a level without custom events', () => {
        expect(CustomEventNames.of(Level.createNew())).toEqual([]);
    });
});
