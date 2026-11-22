import { describe, expect, test } from 'vitest';

import { InputComponent } from '../../../core/components/index.ts';
import { Level } from '../../../core/level/index.ts';

import { MissingInputsRule } from './MissingInputsRule.ts';

describe('MissingInputsRule', () => {
    test("a new level's World has its inputs and no note", () => {
        const level = Level.createNew();

        expect(new MissingInputsRule().check(level.world)).toEqual([]);
    });

    test('a World without an InputComponent gets the note, whose fix adds the five inputs', () => {
        const level = Level.createNew();
        level.world.removeComponent(InputComponent);

        expect(new MissingInputsRule().check(level.world)).toEqual([
            {
                kind: 'warning',
                entityId: level.world.id,
                componentType: 'PhysicsWorldComponent',
                fieldKey: undefined,
                text: 'No inputs.',
                fix: { kind: 'addComponent', label: 'Add the five inputs', componentType: 'InputComponent' },
            },
        ]);
    });

    test('any other entity gets nothing', () => {
        const level = Level.createNew();

        expect(new MissingInputsRule().check(level.camera)).toEqual([]);
    });
});
