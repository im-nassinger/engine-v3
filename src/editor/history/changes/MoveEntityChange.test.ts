import { describe, expect, test } from 'vitest';

import { TransformComponent } from '../../../core/components/index.ts';
import type { TransformValues } from '../../../core/geometry/index.ts';

import { buildChangesTestLevel, snapshotOf } from './changesTestLevel.ts';
import { MoveEntityChange } from './MoveEntityChange.ts';

const IN_GROUP: TransformValues = { position: { x: -7, y: 3 }, rotation: -30, scale: { x: 0.5, y: 1 }, skew: -10 };

describe('MoveEntityChange', () => {
    test('moves an entity into a group with new values, and revert gives back the level exactly', () => {
        const { level, square, group } = buildChangesTestLevel();
        const before = snapshotOf(level);
        const oldIndex = level.world.children.indexOf(square);
        const oldTransform = square.requireComponent(TransformComponent);
        const change = new MoveEntityChange({
            entityId: square.id,
            oldPlace: { parentId: level.world.id, index: oldIndex },
            newPlace: { parentId: group.id, index: 1 },
            oldTransform: { position: oldTransform.get('position'), rotation: 0, scale: { x: 1, y: 1 }, skew: 0 },
            newTransform: IN_GROUP,
        });

        change.apply(level);
        expect(square.parent).toBe(group);
        expect(group.children.indexOf(square)).toBe(1);
        expect(square.requireComponent(TransformComponent).get('skew')).toBe(-10);

        change.revert(level);
        expect(snapshotOf(level)).toEqual(before);
    });

    test('reorders inside one parent and back', () => {
        const { level, rope, group } = buildChangesTestLevel();
        const before = snapshotOf(level);
        const ropeTransform = rope.requireComponent(TransformComponent);
        const values: TransformValues = {
            position: ropeTransform.get('position'),
            rotation: ropeTransform.get('rotation'),
            scale: ropeTransform.get('scale'),
            skew: ropeTransform.get('skew'),
        };
        const lastIndex = level.world.children.length - 1;
        const change = new MoveEntityChange({
            entityId: rope.id,
            oldPlace: { parentId: level.world.id, index: 0 },
            newPlace: { parentId: level.world.id, index: lastIndex },
            oldTransform: values,
            newTransform: values,
        });

        change.apply(level);
        expect(level.world.children.at(-1)).toBe(rope);
        expect(level.world.children.indexOf(group)).toBe(1);

        change.revert(level);
        expect(snapshotOf(level)).toEqual(before);
    });

    test('throws on a move the level refuses', () => {
        const { level, group, child } = buildChangesTestLevel();
        const change = new MoveEntityChange({
            entityId: group.id,
            oldPlace: { parentId: level.world.id, index: 0 },
            newPlace: { parentId: child.id, index: 0 },
            oldTransform: IN_GROUP,
            newTransform: IN_GROUP,
        });

        const apply = () => change.apply(level);

        expect(apply).toThrow(`Entity ${group.id} could not move into ${child.id}: cycle.`);
    });
});
