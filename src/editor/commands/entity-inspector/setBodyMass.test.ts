import { describe, expect, test } from 'vitest';

import { BodyComponent, ShapeComponent, SurfaceComponent, TransformComponent } from '../../../core/components/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { BodyMass } from '../../../core/physics/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { buildCommandTestSession, expectRoundTrip } from '../testing/commandTestSession.ts';

import { setBodyMass } from './setBodyMass.ts';

// The square and the child as crates, the square scaled up so the two have different areas.
function buildSession() {
    const timer = new ManualTimer();
    const built = buildCommandTestSession(timer.clock, timer, new ManualFrames());

    for (const crate of [built.square, built.child]) {
        crate.addComponent(new ShapeComponent());
        crate.addComponent(new BodyComponent());
        crate.addComponent(new SurfaceComponent());
    }
    built.square.requireComponent(TransformComponent).set('scale', { x: 2, y: 2 });

    return built;
}

function densityOf(entity: Entity) {
    return entity.requireComponent(SurfaceComponent).get('density');
}

describe('setBodyMass', () => {
    test("sets a body's density so it weighs the typed mass, in one step, passing the round trip", () => {
        const { session, square } = buildSession();
        const { openLevel } = session;

        const trip = expectRoundTrip(session, () => setBodyMass(openLevel, [square.id], 8));

        expect(trip.afterUndo).toEqual(trip.before);
        expect(trip.afterRedo).toEqual(trip.after);
        expect(BodyMass.of(square, openLevel.caches)?.mass).toBeCloseTo(8);
        expect(openLevel.history.undoLabel).toBe('Change Mass');
    });

    test('gives bodies of different sizes different densities and the same mass', () => {
        const { session, square, child } = buildSession();
        const { openLevel } = session;

        setBodyMass(openLevel, [square.id, child.id], 10);

        expect(BodyMass.of(square, openLevel.caches)?.mass).toBeCloseTo(10);
        expect(BodyMass.of(child, openLevel.caches)?.mass).toBeCloseTo(10);
        expect(densityOf(square)).not.toBeCloseTo(densityOf(child));
        expect(openLevel.history.undoCount).toBe(1);
    });

    test("keeps the ratio between a body's surfaces, merged ones too", () => {
        const { session, group, child } = buildSession();
        const { openLevel } = session;
        child.removeComponent(BodyComponent);
        group.addComponent(new BodyComponent());
        group.addComponent(new ShapeComponent());
        group.addComponent(new SurfaceComponent());
        child.requireComponent(SurfaceComponent).set('density', 3);

        setBodyMass(openLevel, [group.id], 20);

        expect(BodyMass.of(group, openLevel.caches)?.mass).toBeCloseTo(20);
        expect(densityOf(child) / densityOf(group)).toBeCloseTo(3);
    });

    test('gives every surface one density when all of them are 0', () => {
        const { session, square } = buildSession();
        const { openLevel } = session;
        square.requireComponent(SurfaceComponent).set('density', 0);

        setBodyMass(openLevel, [square.id], 4);

        expect(BodyMass.of(square, openLevel.caches)?.mass).toBeCloseTo(4);
    });

    test('refuses a mass that needs a density above 100, and makes no step', () => {
        const { session, square, child } = buildSession();
        const { openLevel } = session;

        const outcome = setBodyMass(openLevel, [square.id, child.id], 1_000_000);

        expect(outcome).toEqual({ kind: 'refused', reason: 'That mass needs a density above 100' });
        expect(densityOf(square)).toBe(1);
        expect(openLevel.history.undoCount).toBe(0);
    });

    test('refuses a body with no area', () => {
        const { session, square } = buildSession();
        square.removeComponent(SurfaceComponent);

        const outcome = setBodyMass(session.openLevel, [square.id], 5);

        expect(outcome).toEqual({ kind: 'refused', reason: 'Mass needs a shape with an area' });
    });
});
