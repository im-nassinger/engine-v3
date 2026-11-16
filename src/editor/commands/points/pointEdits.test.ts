import { describe, expect, test } from 'vitest';

import { ShapeComponent, TransformComponent } from '../../../core/components/index.ts';
import type { Point, ShapeGeometry } from '../../../core/geometry/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { EditorSession } from '../../session/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';

import { addPoint } from './addPoint.ts';
import { deletePoints } from './deletePoints.ts';
import { nudgePoints } from './nudgePoints.ts';
import { PointsMove } from './PointsMove.ts';

const SQUARE_POINTS: readonly Point[] = [
    { x: -50, y: -50 },
    { x: 50, y: -50 },
    { x: 50, y: 50 },
    { x: -50, y: 50 },
];

// A polygon square at 100, 100 and a 100 px rectangle.
function buildPointEditTest(geometry: ShapeGeometry = { kind: 'polygon', points: SQUARE_POINTS }) {
    const level = Level.createNew();
    const shape = level.createEntity(level.world, 0);
    shape.addComponent(
        new TransformComponent({ position: { x: 100, y: 100 }, rotation: 0, scale: { x: 1, y: 1 }, skew: 0 }),
    );
    shape.addComponent(new ShapeComponent({ geometry }));
    const rectangle = level.createEntity(level.world, 0);
    rectangle.addComponent(new TransformComponent());
    rectangle.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width: 100, height: 100 } }));

    const timer = new ManualTimer();
    const session = new EditorSession({ level, clock: timer.clock, timer, frames: new ManualFrames() });

    return { shape, rectangle, openLevel: session.openLevel, timer };
}

function pointsOf(entity: Entity) {
    const geometry = entity.requireComponent(ShapeComponent).get('geometry');
    if (geometry.kind !== 'polygon' && geometry.kind !== 'line') throw new Error('Not a polygon or line.');

    return geometry.points;
}

describe('the point edits', () => {
    test('are refused on a shape without points, a locked shape and during a drag', () => {
        const { shape, rectangle, openLevel } = buildPointEditTest();

        expect(deletePoints(openLevel, rectangle, [0])).toEqual({
            kind: 'refused',
            reason: 'Only a polygon or a line has points',
        });

        openLevel.liveEdit.begin([]);
        expect(nudgePoints(openLevel, shape, [0], { x: 1, y: 0 })).toEqual({
            kind: 'refused',
            reason: 'Not during a drag',
        });
        openLevel.liveEdit.cancel();

        shape.setLocked(true);
        expect(addPoint(openLevel, shape, 0, { x: 100, y: 50 }).kind).toBe('refused');
        expect(pointsOf(shape)).toEqual(SQUARE_POINTS);
    });

    test('a move with no existing point selected is refused', () => {
        const { shape, openLevel } = buildPointEditTest();

        expect(PointsMove.of(openLevel, shape, [7])).toEqual({ kind: 'refused', reason: 'No points selected' });
    });

    test('nudges of the same shape join while each comes within a second of the last', () => {
        const { shape, openLevel, timer } = buildPointEditTest();

        nudgePoints(openLevel, shape, [0], { x: 1, y: 0 });
        timer.advance(900);
        nudgePoints(openLevel, shape, [0], { x: 1, y: 0 });
        timer.advance(1_100);
        nudgePoints(openLevel, shape, [0], { x: 0, y: 1 });

        expect(pointsOf(shape)[0]).toEqual({ x: -48, y: -49 });
        expect(openLevel.history.undoCount).toBe(2);
    });

    test("a point is added after the edge's first point, in the shape's own space", () => {
        const { shape, openLevel } = buildPointEditTest();

        const outcome = addPoint(openLevel, shape, 3, { x: 50, y: 120 });

        expect(outcome).toEqual({ kind: 'added', index: 4 });
        expect(pointsOf(shape)[4]).toEqual({ x: -50, y: 20 });
    });

    test('the 1,001st point is refused', () => {
        const points = Array.from({ length: 1_000 }, (_unused, index) => ({ x: index, y: index % 2 }));
        const { shape, openLevel } = buildPointEditTest({ kind: 'line', points });

        const outcome = addPoint(openLevel, shape, 0, { x: 100.5, y: 100.5 });

        expect(outcome).toEqual({ kind: 'refused', reason: 'A line holds at most 1,000 points' });
        expect(pointsOf(shape)).toHaveLength(1_000);
    });

    test('deleting keeps a polygon at 3 points at least', () => {
        const { shape, openLevel } = buildPointEditTest();

        expect(deletePoints(openLevel, shape, [0])).toEqual({ kind: 'done' });
        expect(deletePoints(openLevel, shape, [0])).toEqual({
            kind: 'refused',
            reason: 'A polygon keeps at least 3 points',
        });
        expect(pointsOf(shape)).toHaveLength(3);
        expect(openLevel.history.undoLabel).toBe('Delete points of Entity');
    });
});
