import { describe, expect, test } from 'vitest';

import { BodyComponent, TransformComponent } from '../../../core/components/index.ts';

import { AddComponentChange } from './AddComponentChange.ts';
import { buildChangesTestLevel, snapshotOf } from './changesTestLevel.ts';
import { RemoveComponentChange } from './RemoveComponentChange.ts';

describe('AddComponentChange', () => {
    test('adds a copy of the component, and revert gives back the level exactly', () => {
        const { level, square } = buildChangesTestLevel();
        const before = snapshotOf(level);
        const body = new BodyComponent({ ...BodyComponent.schema.defaults(), linearDamping: 2 });
        const change = new AddComponentChange({ entityId: square.id, component: body });

        body.set('linearDamping', 7);
        change.apply(level);
        const added = square.requireComponent(BodyComponent);
        expect(added).not.toBe(body);
        expect(added.get('linearDamping')).toBe(2);

        change.revert(level);
        expect(square.hasComponent(BodyComponent)).toBe(false);
        expect(snapshotOf(level)).toEqual(before);
    });

    test('puts a fresh copy back on redo, so an edit before undo never comes back', () => {
        const { level, square } = buildChangesTestLevel();
        const change = new AddComponentChange({ entityId: square.id, component: new BodyComponent() });

        change.apply(level);
        square.requireComponent(BodyComponent).set('linearDamping', 5);
        change.revert(level);
        change.apply(level);

        expect(square.requireComponent(BodyComponent).get('linearDamping')).toBe(0);
    });

    test('throws when the entity already has one', () => {
        const { level, square } = buildChangesTestLevel();
        const change = new AddComponentChange({ entityId: square.id, component: new TransformComponent() });

        const apply = () => change.apply(level);

        expect(apply).toThrow(`Entity ${square.id} already has a TransformComponent.`);
    });
});

describe('RemoveComponentChange', () => {
    test('removes only that component, and revert gives back its values exactly', () => {
        const { level, square } = buildChangesTestLevel();
        square.addComponent(new BodyComponent({ ...BodyComponent.schema.defaults(), type: 'dynamic', bullet: true }));
        const before = snapshotOf(level);
        const change = new RemoveComponentChange({
            entityId: square.id,
            component: square.requireComponent(BodyComponent),
        });

        change.apply(level);
        expect(square.hasComponent(BodyComponent)).toBe(false);
        expect(square.hasComponent(TransformComponent)).toBe(true);

        change.revert(level);
        expect(square.requireComponent(BodyComponent).get('bullet')).toBe(true);
        expect(snapshotOf(level)).toEqual(before);
    });

    test('throws when the entity no longer has it', () => {
        const { level, square } = buildChangesTestLevel();
        const change = new RemoveComponentChange({ entityId: square.id, component: new BodyComponent() });

        const apply = () => change.apply(level);

        expect(apply).toThrow(`Entity ${square.id} has no BodyComponent.`);
    });
});
