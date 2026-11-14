import { describe, expect, test } from 'vitest';

import { SpeedComponent, WeightComponent } from '../components/testing/index.ts';

import type { EntityChange } from './EntityChange.ts';
import { Level } from './Level.ts';

function createCrate() {
    const level = Level.createNew();
    const crate = level.createEntity(level.world, 0);

    return { level, crate };
}

function recordChanges(changes: EntityChange[]) {
    return (change: EntityChange) => {
        changes.push(change);
    };
}

describe('Entity components', () => {
    test('a second component of one type is refused', () => {
        const { crate } = createCrate();
        const firstWeight = new WeightComponent();

        const first = crate.addComponent(firstWeight);
        const second = crate.addComponent(new WeightComponent());

        expect(first).toEqual({ added: true });
        expect(second).toEqual({ added: false, reason: 'alreadyHas' });
        expect(crate.requireComponent(WeightComponent)).toBe(firstWeight);
    });

    test('components are listed in card order', () => {
        const { crate } = createCrate();
        const weight = new WeightComponent();
        const speed = new SpeedComponent();

        crate.addComponent(weight);
        crate.addComponent(speed);

        expect(crate.components).toEqual([speed, weight]);
    });

    test('looks components up by class', () => {
        const { crate } = createCrate();
        crate.addComponent(new WeightComponent());

        expect(crate.hasComponent(WeightComponent)).toBe(true);
        expect(crate.hasComponent(SpeedComponent)).toBe(false);
        expect(crate.getComponent(SpeedComponent)).toBeUndefined();
        expect(() => crate.requireComponent(SpeedComponent)).toThrow('has no SpeedComponent');
    });

    test('a value change on a held component is announced by the entity', () => {
        const { crate } = createCrate();
        const weight = new WeightComponent();
        crate.addComponent(weight);
        const changes: EntityChange[] = [];
        crate.changed.subscribe(recordChanges(changes));

        weight.set('weight', 20);

        expect(changes).toEqual([{ kind: 'valueChanged', component: weight, key: 'weight' }]);
    });

    test('a removed component no longer reaches the entity', () => {
        const { crate } = createCrate();
        const weight = new WeightComponent();
        crate.addComponent(weight);

        const removed = crate.removeComponent(WeightComponent);
        const changes: EntityChange[] = [];
        crate.changed.subscribe(recordChanges(changes));
        weight.set('weight', 30);

        expect(removed).toBe(weight);
        expect(crate.hasComponent(WeightComponent)).toBe(false);
        expect(changes).toEqual([]);
    });

    test('removing a component the entity lacks returns undefined', () => {
        const { crate } = createCrate();

        expect(crate.removeComponent(WeightComponent)).toBeUndefined();
    });
});

describe('Entity switches', () => {
    test('hidden and locked are announced only when they change', () => {
        const { crate } = createCrate();
        const changes: EntityChange[] = [];
        crate.changed.subscribe(recordChanges(changes));

        crate.setHidden(true);
        crate.setHidden(true);
        crate.setLocked(true);

        expect(crate.isHidden).toBe(true);
        expect(crate.isLocked).toBe(true);
        expect(changes).toEqual([
            { kind: 'switchChanged', switchName: 'hidden' },
            { kind: 'switchChanged', switchName: 'locked' },
        ]);
    });
});
