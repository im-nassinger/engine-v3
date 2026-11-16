import { describe, expect, test } from 'vitest';

import { BodyComponent, SurfaceComponent } from '../../components/index.ts';
import type { Entity } from '../../level/index.ts';
import { Level } from '../../level/index.ts';

import { countBodyChanges } from './bodyChanges.ts';

function withBody(entity: Entity, merge = true) {
    const body = new BodyComponent();
    body.set('merge', merge);
    entity.addComponent(body);

    return entity;
}

function withSurface(entity: Entity) {
    entity.addComponent(new SurfaceComponent());

    return entity;
}

// A car with a wheel, and a crate with a lid, both in the World.
function buildLevel() {
    const level = Level.createNew();
    const car = withBody(level.createEntity(level.world, 0));
    const wheel = withSurface(level.createEntity(car, 0));
    const crate = withBody(level.createEntity(level.world, 0));
    const lid = withSurface(level.createEntity(crate, 0));

    return { level, car, wheel, crate, lid };
}

describe('countBodyChanges', () => {
    test("a crate's child dropped into a car changes body", () => {
        const { car, lid } = buildLevel();

        expect(countBodyChanges([{ entity: lid, newParent: car }])).toBe(1);
    });

    test('a crate dropped into a car merges, and takes its lid with it', () => {
        const { car, crate } = buildLevel();

        expect(countBodyChanges([{ entity: crate, newParent: car }])).toBe(2);
    });

    test('a crate with Merge unticked keeps its body inside the car', () => {
        const { level, car } = buildLevel();
        const trailer = withBody(level.createEntity(level.world, 0), false);
        withSurface(level.createEntity(trailer, 0));

        expect(countBodyChanges([{ entity: trailer, newParent: car }])).toBe(0);
    });

    test('a move that keeps the body counts nothing', () => {
        const { level, car, wheel } = buildLevel();
        const frame = level.createEntity(car, 1);

        expect(countBodyChanges([{ entity: wheel, newParent: frame }])).toBe(0);
        expect(countBodyChanges([{ entity: wheel, newParent: car }])).toBe(0);
    });

    test('a static surface going into a body changes, and so does one leaving it', () => {
        const { level, car, wheel } = buildLevel();
        const floor = withSurface(level.createEntity(level.world, 0));

        expect(countBodyChanges([{ entity: floor, newParent: car }])).toBe(1);
        expect(countBodyChanges([{ entity: wheel, newParent: level.world }])).toBe(1);
    });

    test('a plain group counts only what takes part in physics inside it', () => {
        const { level, car } = buildLevel();
        const group = level.createEntity(level.world, 0);
        level.createEntity(group, 0);
        withSurface(level.createEntity(group, 1));

        expect(countBodyChanges([{ entity: group, newParent: car }])).toBe(1);
    });

    test('adds up several moves, and leaves the level as it was', () => {
        const { level, car, crate, lid } = buildLevel();
        const floor = withSurface(level.createEntity(level.world, 0));

        expect(
            countBodyChanges([
                { entity: lid, newParent: car },
                { entity: floor, newParent: crate },
            ]),
        ).toBe(2);
        expect(lid.parent).toBe(crate);
        expect(floor.parent).toBe(level.world);
    });
});
