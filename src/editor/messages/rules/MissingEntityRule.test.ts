import { describe, expect, test } from 'vitest';

import { CameraComponent, TriggerComponent } from '../../../core/components/index.ts';
import type { Trigger } from '../../../core/fields/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { EntityId } from '../../../core/level/index.ts';

import { MissingEntityRule } from './MissingEntityRule.ts';

const rule = new MissingEntityRule();

function destroys(...entities: readonly EntityId[]): Trigger {
    return {
        id: 1,
        name: null,
        on: true,
        when: { kind: 'touched' },
        checks: [],
        actions: entities.map((entity) => ({ kind: 'destroy', target: { kind: 'entity', entity } })),
    };
}

// A button whose trigger destroys two doors, with the doors still there.
function buildLevel() {
    const level = Level.createNew();
    const left = level.createEntity(level.world, 0);
    const right = level.createEntity(level.world, 1);
    const button = level.createEntity(level.world, 2);
    button.addComponent(new TriggerComponent({ triggers: [destroys(left.id, right.id)], nextTriggerId: 2 }));

    return { level, left, right, button };
}

function missingWarning(entityId: EntityId, componentType: string, fieldKey: string) {
    return { kind: 'warning', entityId, componentType, fieldKey, text: 'missing entity', fix: undefined };
}

describe('MissingEntityRule', () => {
    test("a trigger's targets are read, and nothing is said while they are there", () => {
        const { level, left, right, button } = buildLevel();

        expect(rule.readsEntities(button)).toEqual([left.id, right.id]);
        expect(rule.check(button, level)).toEqual([]);
    });

    test('a deleted target gives `missing entity` on the triggers, once for each gone link', () => {
        const { level, left, right, button } = buildLevel();
        level.removeEntity(left);
        level.removeEntity(right);

        expect(rule.check(button, level)).toEqual([
            missingWarning(button.id, 'TriggerComponent', 'triggers'),
            missingWarning(button.id, 'TriggerComponent', 'triggers'),
        ]);
    });

    test("an entity field still works: the camera's Follow on a deleted entity", () => {
        const { level, left } = buildLevel();
        level.camera.getComponent(CameraComponent)?.set('follow', left.id);
        level.removeEntity(left);

        expect(rule.check(level.camera, level)).toEqual([missingWarning(level.camera.id, 'CameraComponent', 'follow')]);
    });
});
