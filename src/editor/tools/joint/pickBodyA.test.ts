import { describe, expect, test } from 'vitest';

import { SurfaceComponent } from '../../../core/components/index.ts';

import { areaOf, pickBodyA } from './pickBodyA.ts';
import { addSquare, buildJointTest } from './testing/jointToolTest.ts';

describe('pickBodyA', () => {
    test('the smaller body by area is A, and each keeps its end', () => {
        const setup = buildJointTest();
        const big = addSquare(setup, { name: 'Big', at: { x: 0, y: 0 }, size: 100 });
        const small = addSquare(setup, { name: 'Small', at: { x: 0, y: 0 }, size: 10 });
        const caches = setup.session.openLevel.caches;

        const picked = pickBodyA({ body: big, at: { x: 1, y: 1 } }, { body: small, at: { x: 2, y: 2 } }, caches);

        expect(picked.a).toEqual({ body: small, at: { x: 2, y: 2 } });
        expect(picked.b).toEqual({ body: big, at: { x: 1, y: 1 } });
    });

    test('on a tie the first given is A', () => {
        const setup = buildJointTest();
        const one = addSquare(setup, { name: 'One', at: { x: 0, y: 0 }, size: 50 });
        const other = addSquare(setup, { name: 'Other', at: { x: 0, y: 0 }, size: 50 });
        const caches = setup.session.openLevel.caches;

        const picked = pickBodyA({ body: one, at: { x: 0, y: 0 } }, { body: other, at: { x: 0, y: 0 } }, caches);

        expect(picked.a.body).toBe(one);
    });

    test('area, not mass: a small heavy body is still the smaller', () => {
        const setup = buildJointTest();
        const heavy = addSquare(setup, { name: 'Heavy', at: { x: 0, y: 0 }, size: 20 });
        heavy.requireComponent(SurfaceComponent).set('density', 1000);
        const light = addSquare(setup, { name: 'Light', at: { x: 0, y: 0 }, size: 100 });
        const caches = setup.session.openLevel.caches;

        expect(areaOf(heavy, caches)).toBeCloseTo(400);
        expect(pickBodyA({ body: light, at: { x: 0, y: 0 } }, { body: heavy, at: { x: 0, y: 0 } }, caches).a.body).toBe(
            heavy,
        );
    });

    test('a surface with no body has its own scaled area', () => {
        const setup = buildJointTest();
        const ground = addSquare(setup, { name: 'Ground', at: { x: 0, y: 0 }, size: 10, physics: 'surface' });
        const caches = setup.session.openLevel.caches;

        expect(areaOf(ground, caches)).toBeCloseTo(100);
    });
});
