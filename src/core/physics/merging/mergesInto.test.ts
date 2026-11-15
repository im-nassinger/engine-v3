import { describe, expect, test } from 'vitest';

import { BodyComponent, SurfaceComponent } from '../../components/index.ts';
import type { Entity } from '../../level/index.ts';
import { Level } from '../../level/index.ts';

import { mergesInto } from './mergesInto.ts';

function withBody(entity: Entity, merge = true) {
    const body = new BodyComponent();
    body.set('merge', merge);
    entity.addComponent(body);

    return entity;
}

describe('mergesInto', () => {
    test('a surface without a body merges into the body above it', () => {
        const level = Level.createNew();
        const car = withBody(level.createEntity(level.world, 0));
        const wheel = level.createEntity(car, 0);
        wheel.addComponent(new SurfaceComponent());

        expect(mergesInto(wheel)).toBe(car);
    });

    test('groups without a body in between are skipped', () => {
        const level = Level.createNew();
        const car = withBody(level.createEntity(level.world, 0));
        const group = level.createEntity(car, 0);
        const wheel = level.createEntity(group, 0);

        expect(mergesInto(wheel)).toBe(car);
    });

    test('a child with Merge unticked is a body of its own', () => {
        const level = Level.createNew();
        const car = withBody(level.createEntity(level.world, 0));
        const trailer = withBody(level.createEntity(car, 0), false);

        expect(mergesInto(trailer)).toBeUndefined();
        expect(mergesInto(level.createEntity(trailer, 0))).toBe(trailer);
    });

    test('a child body with Merge ticked merges, and so do the shapes under it', () => {
        const level = Level.createNew();
        const car = withBody(level.createEntity(level.world, 0));
        const door = withBody(level.createEntity(car, 0));
        const handle = level.createEntity(door, 0);

        expect(mergesInto(door)).toBe(car);
        expect(mergesInto(handle)).toBe(car);
    });

    test('nothing above with a body merges into nothing', () => {
        const level = Level.createNew();
        const crate = withBody(level.createEntity(level.world, 0));
        const loose = level.createEntity(level.world, 1);

        expect(mergesInto(crate)).toBeUndefined();
        expect(mergesInto(loose)).toBeUndefined();
        expect(mergesInto(level.world)).toBeUndefined();
    });
});
