import { describe, expect, test } from 'vitest';

import { InputComponent, TriggerComponent } from '../../components/index.ts';
import type { Trigger, When } from '../../fields/index.ts';
import type { KeyCode } from '../../keys/index.ts';
import { Level } from '../../level/index.ts';

import { levelKeys } from './levelKeys.ts';

function trigger(id: number, when: When | null): Trigger {
    return { id, name: null, on: true, when, checks: [], actions: [], repeat: { kind: 'everyTime' } };
}

describe('levelKeys', () => {
    test("lists a new level's five inputs' keys", () => {
        const keys = levelKeys(Level.createNew());

        expect([...keys].sort()).toEqual(
            ['ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'KeyA', 'KeyD', 'KeyS', 'KeyW', 'Space'].sort(),
        );
    });

    test('adds the raw keys the triggers wait for, and skips an unset key and other events', () => {
        const level = Level.createNew();
        level.world.removeComponent(InputComponent);
        const entity = level.createEntity(level.world, 1);
        const triggers = [
            trigger(1, { kind: 'key', key: 'KeyE' as KeyCode, how: 'pressed' }),
            trigger(2, { kind: 'key', key: null, how: 'held' }),
            trigger(3, { kind: 'input', input: 'jump', how: 'pressed' }),
            trigger(4, null),
        ];
        entity.addComponent(new TriggerComponent({ triggers, nextTriggerId: 5 }));

        expect([...levelKeys(level)]).toEqual(['KeyE']);
    });
});
