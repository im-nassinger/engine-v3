import { describe, expect, test } from 'vitest';

import { ShapeComponent, TransformComponent } from '../components/index.ts';
import { Level } from '../entities/index.ts';

import { DerivedCaches } from './DerivedCaches.ts';

function buildLevel() {
    const level = Level.createNew();
    const crate = level.createEntity(level.world, 0);
    const transform = new TransformComponent();
    transform.set('position', { x: 100, y: 50 });
    crate.addComponent(transform);
    crate.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width: 40, height: 20 } }));

    return { level, crate, transform };
}

describe('DerivedCaches', () => {
    test('the bounds read the same world matrices', () => {
        const { level, crate, transform } = buildLevel();
        const caches = new DerivedCaches(level);

        const before = caches.bounds.ownBoundsOf(crate);
        transform.set('position', { x: 200, y: 50 });
        const after = caches.bounds.ownBoundsOf(crate);

        expect(caches.worldMatrices.cachedCount).toBeGreaterThan(0);
        expect((after?.left ?? 0) - (before?.left ?? 0)).toBe(100);
    });

    test('all four follow the level', () => {
        const { level, crate } = buildLevel();
        const caches = new DerivedCaches(level);

        expect(caches.hidden.isHidden(crate)).toBe(false);
        expect(caches.pieces.piecesOf(crate)).toBeDefined();

        crate.setHidden(true);

        expect(caches.hidden.isHidden(crate)).toBe(true);
    });

    test('after dispose none of them follows the level', () => {
        const { level, crate } = buildLevel();
        const caches = new DerivedCaches(level);
        caches.hidden.isHidden(crate);

        caches.dispose();
        crate.setHidden(true);

        expect(caches.hidden.isHidden(crate)).toBe(false);
    });
});
