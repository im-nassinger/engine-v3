import { describe, expect, test } from 'vitest';

import { BodyComponent, ShapeComponent, SurfaceComponent, TransformComponent } from '../../../core/components/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { BodyMass } from '../../../core/physics/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { buildCommandTestSession } from '../testing/commandTestSession.ts';

import { MassSlide } from './MassSlide.ts';

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

    const openLevel = built.session.openLevel;
    const slide = new MassSlide({ openLevel, entityIds: [built.square.id, built.child.id] });

    return { ...built, openLevel, slide };
}

function densityOf(entity: Entity) {
    return entity.requireComponent(SurfaceComponent).get('density');
}

describe('MassSlide', () => {
    test('changes every body’s mass while dragged, and the release makes one step "Change Mass"', () => {
        const { openLevel, slide, square, child } = buildSession();

        slide.slideTo(3);
        expect(BodyMass.of(square, openLevel.caches)?.mass).toBeCloseTo(3);
        expect(BodyMass.of(child, openLevel.caches)?.mass).toBeCloseTo(3);
        expect(openLevel.history.undoCount).toBe(0);

        slide.slideTo(5);
        expect(slide.release(5)).toEqual({ kind: 'done' });

        expect(BodyMass.of(square, openLevel.caches)?.mass).toBeCloseTo(5);
        expect(openLevel.history.undoCount).toBe(1);
        expect(openLevel.history.undoLabel).toBe('Change Mass');
    });

    test('keeps the ratios the drag began with after passing through 0', () => {
        const { openLevel, slide, square, child } = buildSession();
        square.requireComponent(SurfaceComponent).set('density', 2);
        const startMass = BodyMass.of(square, openLevel.caches)?.mass ?? 0;

        slide.slideTo(0);
        expect(densityOf(square)).toBe(0);
        slide.slideTo(startMass);
        slide.release(startMass);

        expect(densityOf(square)).toBeCloseTo(2);
        expect(BodyMass.of(child, openLevel.caches)?.mass).toBeCloseTo(startMass);
    });

    test('cancel puts the start densities back and makes no step', () => {
        const { openLevel, slide, square } = buildSession();

        slide.slideTo(7);
        slide.cancel();

        expect(densityOf(square)).toBe(1);
        expect(openLevel.history.undoCount).toBe(0);
    });
});
