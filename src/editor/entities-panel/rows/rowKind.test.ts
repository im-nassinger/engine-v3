import { describe, expect, test } from 'vitest';

import { JointComponent, PathComponent, ShapeComponent } from '../../../core/components/index.ts';
import { Level } from '../../../core/level/index.ts';

import { rowKind } from './rowKind.ts';

describe('rowKind', () => {
    test('the World and the camera have their own kinds', () => {
        const level = Level.createNew();

        expect(rowKind(level.world, level)).toBe('world');
        expect(rowKind(level.camera, level)).toBe('camera');
    });

    test('a shape shows its kind and a joint its type', () => {
        const level = Level.createNew();
        const circle = level.createEntity(level.world, 0);
        circle.addComponent(new ShapeComponent({ geometry: { kind: 'circle', radius: 25 } }));
        const joint = level.createEntity(level.world, 0);
        const jointComponent = new JointComponent();
        jointComponent.set('type', 'spring');
        joint.addComponent(jointComponent);

        expect(rowKind(circle, level)).toBe('circle');
        expect(rowKind(joint, level)).toBe('spring-joint');
    });

    test('a path, a group and a plain entity', () => {
        const level = Level.createNew();
        const path = level.createEntity(level.world, 0);
        path.addComponent(new PathComponent());
        const group = level.createEntity(level.world, 0);
        level.createEntity(group, 0);
        const plain = level.createEntity(level.world, 0);

        expect(rowKind(path, level)).toBe('path');
        expect(rowKind(group, level)).toBe('group');
        expect(rowKind(plain, level)).toBe('entity');
    });

    test('a shape with children is still a shape', () => {
        const level = Level.createNew();
        const square = level.createEntity(level.world, 0);
        square.addComponent(new ShapeComponent());
        level.createEntity(square, 0);

        expect(rowKind(square, level)).toBe('rectangle');
    });
});
