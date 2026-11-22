import { describe, expect, test } from 'vitest';

import { BodyComponent } from '../BodyComponent/BodyComponent.ts';
import { ComponentRegistry } from './ComponentRegistry.ts';
import { createV1Registry } from './createV1Registry.ts';
import { NameComponent } from '../NameComponent/NameComponent.ts';
import { SpeedComponent, WeightComponent } from '../testing/index.ts';

describe('ComponentRegistry', () => {
    test('finds a registered class by its type name, and nothing for an unknown name', () => {
        const registry = new ComponentRegistry();
        registry.register(SpeedComponent);

        expect(registry.find('SpeedComponent')).toBe(SpeedComponent);
        expect(registry.find('WeightComponent')).toBeUndefined();
    });

    test('refuses the same type twice', () => {
        const registry = new ComponentRegistry();
        registry.register(SpeedComponent);

        expect(() => registry.register(SpeedComponent)).toThrow();
    });

    test('lists classes in card order, whatever the order of registration', () => {
        const registry = new ComponentRegistry();
        registry.register(WeightComponent);
        registry.register(SpeedComponent);

        expect(registry.inCardOrder()).toEqual([SpeedComponent, WeightComponent]);
    });

    test('the index is the order of registration, and an unknown name throws', () => {
        const registry = new ComponentRegistry();
        registry.register(WeightComponent);
        registry.register(SpeedComponent);

        expect(registry.indexOf('WeightComponent')).toBe(0);
        expect(registry.indexOf('SpeedComponent')).toBe(1);
        expect(() => registry.indexOf('MissingComponent')).toThrow();
    });
});

describe('the registry', () => {
    test("holds the ten v1 components and v3's, NameComponent first in card order because it has no card", () => {
        const registry = createV1Registry();
        const cardOrder = registry.inCardOrder();

        expect(registry.all()).toHaveLength(11);
        expect(cardOrder[0]).toBe(NameComponent);
        expect(registry.find('BodyComponent')).toBe(BodyComponent);
    });

    test('keeps the Lua indexes fixed', () => {
        const registry = createV1Registry();
        const typeNames = registry.all().map((componentClass) => componentClass.schema.typeName);

        expect(typeNames).toEqual([
            'TransformComponent',
            'NameComponent',
            'ShapeComponent',
            'PathComponent',
            'StyleComponent',
            'BodyComponent',
            'SurfaceComponent',
            'JointComponent',
            'CameraComponent',
            'PhysicsWorldComponent',
            'TagsComponent',
        ]);
    });
});
