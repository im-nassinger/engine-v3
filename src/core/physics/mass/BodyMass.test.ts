import { describe, expect, test } from 'vitest';

import {
    BodyComponent,
    PhysicsWorldComponent,
    ShapeComponent,
    SurfaceComponent,
    TransformComponent,
} from '../../components/index.ts';
import { DerivedCaches } from '../../derived/index.ts';
import type { Entity } from '../../level/index.ts';
import { Level } from '../../level/index.ts';
import type { ShapeGeometry } from '../../geometry/index.ts';

import { BodyMass } from './BodyMass.ts';

const SQUARE_100: ShapeGeometry = { kind: 'rectangle', width: 100, height: 100 };

function placeAt(level: Level, parent: Entity, x: number, y: number) {
    const entity = level.createEntity(parent, 0);
    const transform = new TransformComponent();
    transform.set('position', { x, y });
    entity.addComponent(transform);

    return entity;
}

function addSurface(entity: Entity, geometry: ShapeGeometry, density = 1) {
    entity.addComponent(new ShapeComponent({ geometry }));
    const surface = new SurfaceComponent();
    surface.set('density', density);
    entity.addComponent(surface);

    return entity;
}

function addBody(entity: Entity, merge = true) {
    const body = new BodyComponent();
    body.set('merge', merge);
    entity.addComponent(body);

    return entity;
}

function massOf(entity: Entity, caches: DerivedCaches) {
    return BodyMass.of(entity, caches)?.mass;
}

describe('BodyMass', () => {
    test('a 100 px square at density 1 is 1 kg at the default 100 px per metre', () => {
        const level = Level.createNew();
        const crate = addBody(addSurface(placeAt(level, level.world, 300, 200), SQUARE_100));
        const caches = new DerivedCaches(level);

        const mass = BodyMass.of(crate, caches);

        expect(mass?.mass).toBe(1);
        expect(mass?.centreOfMass).toEqual({ x: 300, y: 200 });
    });

    test("reads its World's Pixels per metre: the same square is 2 m × 2 m, 4 kg, at 50", () => {
        const level = Level.createNew();
        level.world.requireComponent(PhysicsWorldComponent).set('pixelsPerMetre', 50);
        const crate = addBody(addSurface(placeAt(level, level.world, 300, 200), SQUARE_100));
        const caches = new DerivedCaches(level);

        expect(massOf(crate, caches)).toBe(4);
        expect(BodyMass.surfacesOf(crate, caches)[0]?.massAtDensityOne).toBe(4);
    });

    test('a car of three shapes adds them up, centred in level positions', () => {
        const level = Level.createNew();
        const car = addBody(addSurface(placeAt(level, level.world, 500, 500), SQUARE_100));
        addSurface(placeAt(level, car, -100, 0), SQUARE_100);
        const group = placeAt(level, car, 0, 0);
        addSurface(placeAt(level, group, 100, 0), SQUARE_100, 2);
        const caches = new DerivedCaches(level);

        const mass = BodyMass.of(car, caches);

        expect(mass?.mass).toBe(4);
        expect(mass?.centreOfMass?.x).toBeCloseTo(525, 9);
        expect(mass?.centreOfMass?.y).toBeCloseTo(500, 9);
    });

    test('a child with Merge unticked is left out, with everything under it', () => {
        const level = Level.createNew();
        const car = addBody(addSurface(placeAt(level, level.world, 0, 0), SQUARE_100));
        const trailer = addBody(addSurface(placeAt(level, car, 200, 0), SQUARE_100), false);
        addSurface(placeAt(level, trailer, 100, 0), SQUARE_100);
        const caches = new DerivedCaches(level);

        expect(massOf(car, caches)).toBe(1);
        expect(massOf(trailer, caches)).toBe(2);
    });

    test('a child body with Merge ticked adds its surface, and has no mass of its own', () => {
        const level = Level.createNew();
        const car = addBody(addSurface(placeAt(level, level.world, 0, 0), SQUARE_100));
        const door = addBody(addSurface(placeAt(level, car, 100, 0), SQUARE_100));
        const caches = new DerivedCaches(level);

        expect(massOf(car, caches)).toBe(2);
        expect(BodyMass.of(door, caches)).toBeUndefined();
    });

    test('a shape without a SurfaceComponent has no mass', () => {
        const level = Level.createNew();
        const car = addBody(placeAt(level, level.world, 0, 0));
        placeAt(level, car, 0, 0).addComponent(new ShapeComponent({ geometry: SQUARE_100 }));
        const caches = new DerivedCaches(level);

        expect(massOf(car, caches)).toBe(0);
    });

    test('scaling a shape changes its mass, and scaling the body too', () => {
        const level = Level.createNew();
        const car = addBody(placeAt(level, level.world, 0, 0));
        const panel = addSurface(placeAt(level, car, 0, 0), SQUARE_100);
        const caches = new DerivedCaches(level);

        panel.requireComponent(TransformComponent).set('scale', { x: 2, y: 1 });
        expect(massOf(car, caches)).toBeCloseTo(2, 9);

        car.requireComponent(TransformComponent).set('scale', { x: 1, y: 3 });
        expect(massOf(car, caches)).toBeCloseTo(6, 9);
    });

    test('an entity without a BodyComponent has no mass', () => {
        const level = Level.createNew();
        const loose = addSurface(placeAt(level, level.world, 0, 0), SQUARE_100);
        const caches = new DerivedCaches(level);

        expect(BodyMass.of(loose, caches)).toBeUndefined();
    });
});
