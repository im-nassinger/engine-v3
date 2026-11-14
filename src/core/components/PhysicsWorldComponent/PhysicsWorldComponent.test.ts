import { describe, expect, test } from 'vitest';

import { PhysicsWorldComponent } from './PhysicsWorldComponent.ts';
import type { PhysicsWorldValues } from './PhysicsWorldValues.ts';

function applyingKeys(values: PhysicsWorldValues) {
    const applying = PhysicsWorldComponent.schema.fields.filter((field) => field.appliesWhen?.(values) ?? true);

    return applying.map((field) => field.key);
}

describe('PhysicsWorldComponent', () => {
    const defaults = PhysicsWorldComponent.schema.defaults();

    test('a new world pulls down at 9.8 m/s², with open edges', () => {
        const world = new PhysicsWorldComponent();

        expect(world.get('gravityStrength')).toBe(9.8);
        expect(world.get('gravityDirection')).toBe('down');
        expect(world.get('gravityAngle')).toBe(90);
        expect(world.get('walls')).toBe(false);
    });

    test('Gravity angle applies only when the direction is Custom, its value kept', () => {
        expect(applyingKeys(defaults)).toEqual(['gravityStrength', 'gravityDirection', 'walls']);
        expect(applyingKeys({ ...defaults, gravityDirection: 'custom' })).toEqual([
            'gravityStrength',
            'gravityDirection',
            'gravityAngle',
            'walls',
        ]);
    });

    test('gravity strength goes from 0 to 100, and the angle takes any angle', () => {
        const world = new PhysicsWorldComponent();

        expect(world.writeValue('gravityStrength', -3)).toEqual({ ok: true, value: 0 });
        expect(world.writeValue('gravityStrength', 500)).toEqual({ ok: true, value: 100 });
        expect(world.writeValue('gravityAngle', 450)).toEqual({ ok: true, value: 450 });
    });

    test('only Walls is fixed during play', () => {
        const fixedInPlay = PhysicsWorldComponent.schema.fields.filter((field) => !field.changeableInPlay);
        const fixedKeys = fixedInPlay.map((field) => field.key);

        expect(fixedKeys).toEqual(['walls']);
    });
});
