import { describe, expect, test } from 'vitest';

import { PhysicsWorldComponent } from './PhysicsWorldComponent.ts';

describe('PhysicsWorldComponent', () => {
    test('a new world pulls straight down at 9.8 m/s², with open edges', () => {
        const world = new PhysicsWorldComponent();

        expect(world.get('gravity')).toEqual({ x: 0, y: 9.8 });
        expect(world.get('walls')).toBe(false);
    });

    test('gravity is one vector, each axis from -100 to 100', () => {
        const world = new PhysicsWorldComponent();

        expect(world.writeValue('gravity', { x: 101, y: 9.8 })).toEqual({ ok: true, value: { x: 100, y: 9.8 } });
        expect(world.writeValue('gravity', { x: 0, y: -101 })).toEqual({ ok: true, value: { x: 0, y: -100 } });
        expect(world.writeValue('gravity', { x: -3, y: 4 })).toEqual({ ok: true, value: { x: -3, y: 4 } });
    });

    test('zero gravity is 0, 0', () => {
        const world = new PhysicsWorldComponent();

        expect(world.writeValue('gravity', { x: 0, y: 0 })).toEqual({ ok: true, value: { x: 0, y: 0 } });
    });

    test('every field applies, whatever the values', () => {
        const fields = PhysicsWorldComponent.schema.fields;

        expect(fields.map((field) => field.key)).toEqual(['gravity', 'walls']);
        expect(fields.every((field) => field.appliesWhen === undefined)).toBe(true);
    });

    test('only Walls is fixed during play', () => {
        const fixedInPlay = PhysicsWorldComponent.schema.fields.filter((field) => !field.changeableInPlay);
        const fixedKeys = fixedInPlay.map((field) => field.key);

        expect(fixedKeys).toEqual(['walls']);
    });
});
