import { describe, expect, test } from 'vitest';

import {
    TransformComponent,
    TriggerComponent,
    VariablesComponent,
    createV1Registry,
} from '../../../core/components/index.ts';
import type { Trigger } from '../../../core/fields/index.ts';
import { Level } from '../../../core/level/index.ts';

import { TriggerCantRunRule } from './TriggerCantRunRule.ts';

function trigger(parts: Partial<Trigger>): Trigger {
    return {
        id: 1,
        name: null,
        on: true,
        when: { kind: 'touched' },
        checks: [],
        actions: [{ kind: 'win' }],
        ...parts,
    };
}

function buildEntity(triggers: readonly Trigger[]) {
    const level = Level.createNew();
    level.world.addComponent(new VariablesComponent({ variables: [{ name: 'coins', value: 0 }] }));
    const entity = level.createEntity(level.world, 0);
    entity.addComponent(new TransformComponent());
    entity.addComponent(new TriggerComponent({ triggers, nextTriggerId: triggers.length + 1 }));

    return { level, entity };
}

describe('TriggerCantRunRule', () => {
    const rule = new TriggerCantRunRule(createV1Registry());

    test('a trigger with an unset part, or with no action, gets the note under it', () => {
        const { level, entity } = buildEntity([
            trigger({ id: 1 }),
            trigger({ id: 2, when: null }),
            trigger({ id: 3, actions: [] }),
            trigger({
                id: 4,
                checks: [
                    {
                        kind: 'value',
                        target: { kind: 'this' },
                        value: { kind: 'variable', name: 'lives' },
                        compare: 'is',
                        amount: 0,
                    },
                ],
            }),
        ]);

        const messages = rule.check(entity, level);

        expect(messages.map((message) => message.itemId)).toEqual([2, 3, 4]);
        expect(messages[0]).toEqual({
            kind: 'warning',
            entityId: entity.id,
            componentType: 'TriggerComponent',
            fieldKey: 'triggers',
            itemId: 2,
            text: "Doesn't run until every yellow part is set.",
            fix: undefined,
        });
    });

    test('a missing entity only skips its own action, so the trigger still runs and gets no note', () => {
        const { level, entity } = buildEntity([
            trigger({ actions: [{ kind: 'destroy', target: { kind: 'entity', entity: 999 } }] }),
        ]);

        expect(rule.check(entity, level)).toEqual([]);
    });

    test('it reads the World and every entity a Change value picks', () => {
        const { level, entity } = buildEntity([
            trigger({
                actions: [
                    { kind: 'change', target: { kind: 'entity', entity: 7 }, value: null, op: 'add', amount: null },
                ],
            }),
        ]);

        expect(rule.readsEntities(entity, level)).toEqual([level.world.id, 7]);
    });
});
