import { describe, expect, test } from 'vitest';

import { ShapeComponent, TransformComponent } from '../../../core/components/index.ts';
import type { GradientFill } from '../../../core/fields/index.ts';
import { Matrix2D } from '../../../core/geometry/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import { Level } from '../../../core/level/index.ts';

import { FillPlacement } from './FillPlacement.ts';
import { moveGradientHandle } from './moveGradientHandle.ts';

const STOPS = [
    { colour: '#FF0000FF', place: 0 },
    { colour: '#0000FFFF', place: 1 },
];
const LINEAR: GradientFill = { kind: 'linear', stops: STOPS, start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } };
const RADIAL: GradientFill = { kind: 'radial', stops: STOPS, centre: { x: 0.5, y: 0.5 }, radius: 0.5 };

// A 200 by 100 rectangle at 100, 100 in the level, so its box runs from 0, 50 to 200, 150.
function placementOf(rotation = 0) {
    const level = Level.createNew();
    const entity = level.createEntity(level.world, 0);
    entity.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width: 200, height: 100 } }));
    const values = { position: { x: 100, y: 100 }, rotation, scale: { x: 1, y: 1 }, skew: 0 };
    entity.addComponent(new TransformComponent());
    const placement = FillPlacement.of(entity, Matrix2D.fromTransform(values));
    if (placement === undefined) throw new Error('The rectangle has no placement.');

    return placement;
}

function linearOf(fill: GradientFill) {
    if (fill.kind !== 'linear') throw new Error('Not linear.');
    return fill;
}

function radialOf(fill: GradientFill) {
    if (fill.kind !== 'radial') throw new Error('Not radial.');
    return fill;
}

function angleOnScreen(from: Point, to: Point) {
    return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
}

describe('FillPlacement', () => {
    test('turns shares of the box into level positions and back', () => {
        const placement = placementOf();

        expect(placement.shareToLevel({ x: 0, y: 0 })).toEqual({ x: 0, y: 50 });
        expect(placement.shareToLevel({ x: 1, y: 0.5 })).toEqual({ x: 200, y: 100 });
        expect(placement.levelToShare({ x: 50, y: 75 })).toEqual({ x: 0.25, y: 0.25 });
    });
});

describe('moveGradientHandle', () => {
    test('moves the dragged end of a linear gradient to the mouse, in shares of the box', () => {
        const moved = linearOf(moveGradientHandle(LINEAR, 'end', { x: 150, y: 125 }, placementOf(), false));

        expect(moved.end).toEqual({ x: 0.75, y: 0.75 });
        expect(moved.start).toEqual(LINEAR.start);
        expect(moved.stops).toBe(LINEAR.stops);
    });

    test('lands on tenths of a percent and stays within the limits past the box', () => {
        const placement = placementOf();
        const near = linearOf(moveGradientHandle(LINEAR, 'start', { x: 33.3333, y: 100 }, placement, false));
        const far = linearOf(moveGradientHandle(LINEAR, 'start', { x: 100_000, y: -100_000 }, placement, false));

        expect(near.start).toEqual({ x: 0.167, y: 0.5 });
        expect(far.start).toEqual({ x: 11, y: -10 });
    });

    test('with Shift keeps the direction to 15° steps on screen around the end not dragged', () => {
        const placement = placementOf();
        // 20° below the x axis from the start at 0, 100, which isn't 20° in shares of a 2 by 1 box.
        const mouse = { x: 100 * Math.cos(Math.PI / 9), y: 100 + 100 * Math.sin(Math.PI / 9) };
        const moved = linearOf(moveGradientHandle(LINEAR, 'end', mouse, placement, true));

        const start = placement.shareToLevel(moved.start);
        const end = placement.shareToLevel(moved.end);
        expect(angleOnScreen(start, end)).toBeCloseTo(15, 0);
        expect(Math.hypot(end.x - start.x, end.y - start.y)).toBeCloseTo(100, 0);
    });

    test('Shift measures on screen in a turned shape too', () => {
        const placement = placementOf(30);
        const start = placement.shareToLevel(LINEAR.start);
        const mouse = { x: start.x + 100 * Math.cos(1), y: start.y + 100 * Math.sin(1) };
        const moved = linearOf(moveGradientHandle(LINEAR, 'end', mouse, placement, true));

        const angle = angleOnScreen(placement.shareToLevel(moved.start), placement.shareToLevel(moved.end));
        expect(Math.abs(angle / 15 - Math.round(angle / 15))).toBeLessThan(0.02);
    });

    test("a radial gradient's centre moves with its radius kept", () => {
        const moved = radialOf(moveGradientHandle(RADIAL, 'centre', { x: 50, y: 75 }, placementOf(), false));

        expect(moved.centre).toEqual({ x: 0.25, y: 0.25 });
        expect(moved.radius).toBe(0.5);
    });

    test('the radius dot sets the radius from its distance to the centre, in shares', () => {
        const placement = placementOf();
        // 0.25 of the width right and 0.3 of the height down from the centre.
        const moved = radialOf(moveGradientHandle(RADIAL, 'radius', { x: 150, y: 130 }, placement, false));
        const onCentre = radialOf(moveGradientHandle(RADIAL, 'radius', { x: 100, y: 100 }, placement, false));

        expect(moved.radius).toBeCloseTo(Math.hypot(0.25, 0.3), 3);
        expect(onCentre.radius).toBe(0.01);
    });

    test('a handle of the other kind leaves the fill as it is', () => {
        expect(moveGradientHandle(LINEAR, 'radius', { x: 0, y: 0 }, placementOf(), false)).toBe(LINEAR);
        expect(moveGradientHandle(RADIAL, 'end', { x: 0, y: 0 }, placementOf(), false)).toBe(RADIAL);
    });
});
