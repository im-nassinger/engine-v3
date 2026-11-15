import { describe, expect, test } from 'vitest';

import { JointComponent, PathComponent, TransformComponent } from '../../../core/components/index.ts';
import type { Point } from '../../../core/geometry/index.ts';

import { buildChangesTestLevel, snapshotOf } from './changesTestLevel.ts';
import { SetValueChange } from './SetValueChange.ts';

describe('SetValueChange', () => {
    test('apply writes the new value and revert gives back the level exactly', () => {
        const { level, square } = buildChangesTestLevel();
        const before = snapshotOf(level);
        const change = new SetValueChange({
            entityId: square.id,
            schema: TransformComponent.schema,
            key: 'position',
            oldValue: { x: 0, y: 0 },
            newValue: { x: 40, y: -12 },
        });

        change.apply(level);
        const transform = square.requireComponent(TransformComponent);
        expect(transform.get('position')).toEqual({ x: 40, y: -12 });

        change.revert(level);
        expect(snapshotOf(level)).toEqual(before);
    });

    test('clones both values, so changing the caller objects afterwards changes nothing', () => {
        const { level, square } = buildChangesTestLevel();
        const oldPosition = { x: 0, y: 0 };
        const newPosition = { x: 3, y: 4 };
        const change = new SetValueChange({
            entityId: square.id,
            schema: TransformComponent.schema,
            key: 'position',
            oldValue: oldPosition,
            newValue: newPosition,
        });

        oldPosition.x = 99;
        newPosition.x = 99;
        change.apply(level);
        const transform = square.requireComponent(TransformComponent);
        expect(transform.get('position')).toEqual({ x: 3, y: 4 });

        const stored = transform.get('position') as { x: number };
        stored.x = 77;
        change.revert(level);
        change.apply(level);
        expect(transform.get('position')).toEqual({ x: 3, y: 4 });
    });

    test('works on the same entity after it was removed and restored as a new object', () => {
        const { level, square } = buildChangesTestLevel();
        const change = new SetValueChange({
            entityId: square.id,
            schema: TransformComponent.schema,
            key: 'rotation',
            oldValue: 0,
            newValue: 45,
        });

        level.removeEntity(square);
        const restored = level.restoreEntity(square.id, level.world, 0);
        restored.addComponent(new TransformComponent());
        change.apply(level);

        expect(restored.requireComponent(TransformComponent).get('rotation')).toBe(45);
    });

    test('round trips values whose file form differs: an entity link and a path', () => {
        const { level, rope, square, group } = buildChangesTestLevel();
        const before = snapshotOf(level);
        const joint = rope.requireComponent(JointComponent);
        const path = rope.requireComponent(PathComponent);
        const handle: Point = { x: 1, y: 2 };
        const oldPath = path.get('path');
        const newPath = {
            closed: false,
            points: [
                { x: 0, y: 0, handleIn: null, handleOut: handle, corner: 'smooth' as const },
                { x: 50, y: 10, handleIn: null, handleOut: null, corner: 'sharp' as const },
            ],
        };
        const changes = [
            new SetValueChange({
                entityId: rope.id,
                schema: JointComponent.schema,
                key: 'a',
                oldValue: null,
                newValue: square.id,
            }),
            new SetValueChange({
                entityId: rope.id,
                schema: JointComponent.schema,
                key: 'b',
                oldValue: null,
                newValue: group.id,
            }),
            new SetValueChange({
                entityId: rope.id,
                schema: PathComponent.schema,
                key: 'path',
                oldValue: oldPath,
                newValue: newPath,
            }),
        ];

        for (const change of changes) {
            change.apply(level);
        }
        expect(joint.get('a')).toBe(square.id);
        expect(joint.get('b')).toBe(group.id);
        expect(path.get('path')).toEqual(newPath);

        for (const change of [...changes].reverse()) {
            change.revert(level);
        }
        expect(snapshotOf(level)).toEqual(before);
    });

    test('refuses a key the component does not have', () => {
        const { square } = buildChangesTestLevel();

        const build = () =>
            new SetValueChange({
                entityId: square.id,
                schema: TransformComponent.schema,
                key: 'colour',
                oldValue: 0,
                newValue: 1,
            });

        expect(build).toThrow('TransformComponent has no value colour.');
    });

    test('throws when the entity lacks the component', () => {
        const { level, square } = buildChangesTestLevel();
        const change = new SetValueChange({
            entityId: square.id,
            schema: JointComponent.schema,
            key: 'motor',
            oldValue: false,
            newValue: true,
        });

        const apply = () => change.apply(level);

        expect(apply).toThrow(`Entity ${square.id} has no JointComponent.`);
    });
});
