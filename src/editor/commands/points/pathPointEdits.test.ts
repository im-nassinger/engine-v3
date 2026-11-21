import { describe, expect, test } from 'vitest';

import {
    JointComponent,
    NameComponent,
    PathComponent,
    ShapeComponent,
    TransformComponent,
} from '../../../core/components/index.ts';
import type { PathGeometry, PathPoint } from '../../../core/geometry/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { EditorSession } from '../../session/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';

import { addPoint } from './addPoint.ts';
import { deletePoints } from './deletePoints.ts';
import { nudgePoints } from './nudgePoints.ts';
import { setCorner } from './setCorner.ts';

function sharp(x: number, y: number): PathPoint {
    return { x, y, handleIn: null, handleOut: null, corner: 'sharp' };
}

function smooth(x: number, y: number): PathPoint {
    return { x, y, handleIn: { x: -10, y: 0 }, handleOut: { x: 10, y: 0 }, corner: 'smooth' };
}

// A path at the level's origin, so its own positions are level positions.
function buildPathEditTest(path: PathGeometry) {
    const level = Level.createNew();
    const entity = level.createEntity(level.world, 0);
    entity.addComponent(new TransformComponent());
    entity.addComponent(new NameComponent({ name: 'Path 1' }));
    entity.addComponent(new PathComponent({ path }));
    const polygon = level.createEntity(level.world, 0);
    polygon.addComponent(new TransformComponent());
    const square = [sharp(0, 0), sharp(10, 0), sharp(10, 10)].map(({ x, y }) => ({ x, y }));
    polygon.addComponent(new ShapeComponent({ geometry: { kind: 'polygon', points: square } }));

    const timer = new ManualTimer();
    const session = new EditorSession({ level, clock: timer.clock, timer, frames: new ManualFrames() });

    return { entity, polygon, openLevel: session.openLevel };
}

function storedPath(entity: Entity) {
    return entity.requireComponent(PathComponent).get('path');
}

describe('the point edits on a path', () => {
    test("are refused on a Rope's or Spring's path", () => {
        const { entity, polygon, openLevel } = buildPathEditTest({
            closed: false,
            points: [sharp(0, 0), sharp(100, 0)],
        });
        entity.addComponent(new JointComponent({ ...JointComponent.schema.defaults(), a: polygon.id }));

        expect(nudgePoints(openLevel, entity, [0], { x: 1, y: 0 })).toEqual({
            kind: 'refused',
            reason: "A Rope's or Spring's path follows its joint",
        });
    });

    test('a nudge moves the points with their handles', () => {
        const { entity, openLevel } = buildPathEditTest({
            closed: true,
            points: [sharp(0, 0), smooth(50, -50), sharp(100, 0)],
        });

        nudgePoints(openLevel, entity, [1], { x: 0, y: 10 });

        expect(storedPath(entity).points[1]).toEqual(smooth(50, -40));
    });

    test('the 2,001st point is refused', () => {
        const points = Array.from({ length: 2_000 }, (_unused, index) => sharp(index, 0));
        const { entity, openLevel } = buildPathEditTest({ closed: false, points });

        expect(addPoint(openLevel, entity, 0, { x: 0.5, y: 0 })).toEqual({
            kind: 'refused',
            reason: 'A path holds at most 2,000 points',
        });
    });

    test("an open path has no edge after its last point, and a closed one's closing curve takes a point", () => {
        const points = [smooth(0, 0), sharp(100, 0), smooth(100, 100)];
        const open = buildPathEditTest({ closed: false, points });
        expect(addPoint(open.openLevel, open.entity, 2, { x: 50, y: 50 })).toEqual({
            kind: 'refused',
            reason: 'No edge there',
        });

        const closed = buildPathEditTest({ closed: true, points });
        const outcome = addPoint(closed.openLevel, closed.entity, 2, { x: 50, y: 50 });

        expect(outcome).toEqual({ kind: 'added', index: 3 });
        const after = storedPath(closed.entity).points;
        expect(after).toHaveLength(4);
        expect(after[3]?.corner).toBe('smooth');
        // The closing curve's two ends shorten their handles towards each other.
        expect(after[0]?.handleIn?.x).toBeGreaterThan(-10);
        expect(after[2]?.handleOut?.x).toBeLessThan(10);
    });

    test('deleting an end of an open path leaves the new end without its outer handle', () => {
        const { entity, openLevel } = buildPathEditTest({
            closed: false,
            points: [sharp(0, 0), smooth(50, 0), smooth(100, 0), sharp(150, 0)],
        });

        deletePoints(openLevel, entity, [3]);

        expect(storedPath(entity).points.at(-1)).toEqual({ ...smooth(100, 0), handleOut: null });
    });

    test('setCorner gives a sharp point smoothHandles, and lines up a separate point turned smooth', () => {
        const separate: PathPoint = {
            x: 50,
            y: 0,
            handleIn: { x: -10, y: 0 },
            handleOut: { x: 0, y: 20 },
            corner: 'separate',
        };
        const { entity, openLevel } = buildPathEditTest({
            closed: false,
            points: [sharp(0, 0), separate, sharp(90, 0)],
        });

        expect(setCorner(openLevel, entity, 1, 'smooth')).toEqual({ kind: 'done' });
        expect(storedPath(entity).points[1]).toEqual({ ...separate, handleOut: { x: 20, y: 0 }, corner: 'smooth' });

        setCorner(openLevel, entity, 0, 'smooth');
        const first = storedPath(entity).points[0];
        expect(first?.corner).toBe('smooth');
        expect(first?.handleIn).toBeNull();
        expect(first?.handleOut?.x).toBeCloseTo(50 / 3);
        expect(first?.handleOut?.y).toBe(0);
        expect(openLevel.history.undoLabel).toBe('Change a point of Path 1');
    });

    test('setCorner to the corner a point has makes no step, and a polygon has no corners', () => {
        const { entity, polygon, openLevel } = buildPathEditTest({
            closed: false,
            points: [sharp(0, 0), sharp(100, 0)],
        });

        expect(setCorner(openLevel, entity, 0, 'sharp')).toEqual({ kind: 'done' });
        expect(openLevel.history.undoCount).toBe(0);
        expect(setCorner(openLevel, polygon, 0, 'smooth')).toEqual({
            kind: 'refused',
            reason: "Only a path's points have corners",
        });
    });
});
