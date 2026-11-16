import { describe, expect, test } from 'vitest';

import { BodyComponent, ShapeComponent, SurfaceComponent } from '../../components/index.ts';
import type { BodyType } from '../../components/index.ts';
import type { Entity } from '../../level/index.ts';
import { Level } from '../../level/index.ts';

import { BodyMembership } from './BodyMembership.ts';

function withBody(entity: Entity, type: BodyType = 'dynamic', merge = true) {
    const body = new BodyComponent();
    body.set('type', type);
    body.set('merge', merge);
    entity.addComponent(body);

    return entity;
}

function withSurface(entity: Entity) {
    entity.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width: 10, height: 10 } }));
    entity.addComponent(new SurfaceComponent());

    return entity;
}

function withLine(entity: Entity) {
    const points = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
    ];
    entity.addComponent(new ShapeComponent({ geometry: { kind: 'line', points } }));
    entity.addComponent(new SurfaceComponent());

    return entity;
}

describe('BodyMembership', () => {
    test('merged children go into the body above them', () => {
        const level = Level.createNew();
        const car = withSurface(withBody(level.createEntity(level.world, 0)));
        const roof = withSurface(level.createEntity(car, 0));
        const bumper = withSurface(withBody(level.createEntity(car, 1), 'static'));
        const membership = new BodyMembership(level);

        expect(membership.surfaceTargetOf(car)).toEqual({ kind: 'body', body: car });
        expect(membership.surfaceTargetOf(roof)).toEqual({ kind: 'body', body: car });
        expect(membership.surfaceTargetOf(bumper)).toEqual({ kind: 'body', body: car });
        expect(membership.isBuiltBody(car)).toBe(true);
        expect(membership.isBuiltBody(bumper)).toBe(false);
    });

    test('a child with Merge unticked is a body of its own, and its children go into it', () => {
        const level = Level.createNew();
        const car = withBody(level.createEntity(level.world, 0));
        const trailer = withSurface(withBody(level.createEntity(car, 0), 'dynamic', false));
        const load = withSurface(level.createEntity(trailer, 0));
        const membership = new BodyMembership(level);

        expect(membership.isBuiltBody(trailer)).toBe(true);
        expect(membership.surfaceTargetOf(trailer)).toEqual({ kind: 'body', body: trailer });
        expect(membership.surfaceTargetOf(load)).toEqual({ kind: 'body', body: trailer });
        expect(membership.bodyOf(load)).toBe(trailer);
    });

    test('groups without a body in between are skipped', () => {
        const level = Level.createNew();
        const car = withBody(level.createEntity(level.world, 0));
        const group = level.createEntity(car, 0);
        const wheel = withSurface(level.createEntity(group, 0));
        const membership = new BodyMembership(level);

        expect(membership.surfaceTargetOf(wheel)).toEqual({ kind: 'body', body: car });
        expect(membership.bodyOf(group)).toBe(car);
        expect(membership.surfaceTargetOf(group)).toBeUndefined();
    });

    test('a body above that merges too is followed up to the one it merges into', () => {
        const level = Level.createNew();
        const car = withBody(level.createEntity(level.world, 0));
        const door = withBody(level.createEntity(car, 0));
        const handle = withSurface(level.createEntity(door, 0));
        const membership = new BodyMembership(level);

        expect(membership.surfaceTargetOf(handle)).toEqual({ kind: 'body', body: car });
        expect(membership.isBuiltBody(door)).toBe(false);
    });

    test('a surface alone, or in a group without a body, is Static', () => {
        const level = Level.createNew();
        const ground = withSurface(level.createEntity(level.world, 0));
        const group = level.createEntity(level.world, 1);
        const rock = withSurface(level.createEntity(group, 0));
        const membership = new BodyMembership(level);

        expect(membership.surfaceTargetOf(ground)).toEqual({ kind: 'static' });
        expect(membership.surfaceTargetOf(rock)).toEqual({ kind: 'static' });
        expect(membership.bodyOf(ground)).toBeUndefined();
        expect(membership.isBuiltBody(group)).toBe(false);
    });

    test('the World and the camera belong to no body', () => {
        const level = Level.createNew();
        const membership = new BodyMembership(level);

        for (const entity of [level.world, level.camera]) {
            expect(membership.bodyOf(entity)).toBeUndefined();
            expect(membership.isBuiltBody(entity)).toBe(false);
            expect(membership.surfaceTargetOf(entity)).toBeUndefined();
        }
    });

    test('a line on a Dynamic body is skipped, also when it merges into one', () => {
        const level = Level.createNew();
        const plank = withLine(withBody(level.createEntity(level.world, 0)));
        const car = withBody(level.createEntity(level.world, 1));
        const antenna = withLine(withBody(level.createEntity(car, 0), 'static'));
        const membership = new BodyMembership(level);
        const skipped = { kind: 'skipped', reason: 'lineOnDynamicBody' };

        expect(membership.surfaceTargetOf(plank)).toEqual(skipped);
        expect(membership.surfaceTargetOf(antenna)).toEqual(skipped);
        expect(membership.isBuiltBody(plank)).toBe(true);
    });

    test('a line on a Static or Kinematic body, or alone, is kept', () => {
        const level = Level.createNew();
        const rail = withLine(withBody(level.createEntity(level.world, 0), 'static'));
        const lift = withLine(withBody(level.createEntity(level.world, 1), 'kinematic'));
        const floor = withLine(level.createEntity(level.world, 2));
        const membership = new BodyMembership(level);

        expect(membership.surfaceTargetOf(rail)).toEqual({ kind: 'body', body: rail });
        expect(membership.surfaceTargetOf(lift)).toEqual({ kind: 'body', body: lift });
        expect(membership.surfaceTargetOf(floor)).toEqual({ kind: 'static' });
    });
});
