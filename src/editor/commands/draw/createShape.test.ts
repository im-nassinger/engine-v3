import { describe, expect, test } from 'vitest';

import { NameComponent, ShapeComponent, StyleComponent, TransformComponent } from '../../../core/components/index.ts';
import { Matrix2D } from '../../../core/geometry/index.ts';
import type { ShapeGeometry } from '../../../core/geometry/index.ts';
import { labelName } from '../../../core/level/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { buildCommandTestSession, expectRoundTrip } from '../testing/commandTestSession.ts';
import { levelMatrixOf, matrixDifference } from '../testing/levelMatrices.ts';
import { createShape } from './createShape.ts';
import type { ShapeDrawing } from './createShape.ts';

const RECTANGLE: ShapeDrawing = {
    geometry: { kind: 'rectangle', width: 200, height: 100 },
    position: { x: 30, y: 40 },
    rotation: 0,
};

function buildSession() {
    const timer = new ManualTimer();

    return buildCommandTestSession(timer.clock, timer, new ManualFrames());
}

function draw(session: ReturnType<typeof buildSession>['session'], drawing: ShapeDrawing) {
    return createShape(session.openLevel, session.reader, drawing);
}

function requireCreated(outcome: ReturnType<typeof createShape>) {
    if (outcome.kind !== 'created') throw new Error(`Refused: ${outcome.reason}`);

    return outcome.id;
}

describe('createShape', () => {
    test('makes the shape with v1’s default look, on top of the World, selected, as one step', () => {
        const { session, level } = buildSession();

        const id = requireCreated(draw(session, RECTANGLE));

        const shape = level.requireEntity(id);
        expect(level.world.children[0]).toBe(shape);
        expect(labelName(shape)).toBe('Rectangle 1');
        expect(shape.requireComponent(ShapeComponent).get('geometry')).toEqual(RECTANGLE.geometry);
        expect(shape.requireComponent(TransformComponent).get('position')).toEqual({ x: 30, y: 40 });
        const style = shape.requireComponent(StyleComponent);
        const defaultStyle = new StyleComponent();
        for (const key of ['fill', 'outlineColour', 'outlineWidth', 'opacity'] as const) {
            expect(style.get(key)).toEqual(defaultStyle.get(key));
        }
        expect(session.openLevel.selection.ids).toEqual([id]);
        expect(session.openLevel.history.undoCount).toBe(1);
        expect(session.openLevel.history.undoLabel).toBe('Draw Rectangle 1');
    });

    test('names each kind one more than the highest number used with its word', () => {
        const { session, level } = buildSession();
        const named = level.createEntity(level.world, 0);
        named.addComponent(new TransformComponent());
        named.addComponent(new NameComponent({ name: 'Circle 4' }));
        const points = [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 0, y: 10 },
        ];
        const geometries: readonly ShapeGeometry[] = [
            { kind: 'rectangle', width: 10, height: 10 },
            { kind: 'circle', radius: 5 },
            { kind: 'polygon', points },
            { kind: 'line', points },
            { kind: 'rectangle', width: 10, height: 10 },
        ];

        const names = geometries.map((geometry) => {
            const id = requireCreated(draw(session, { geometry, position: { x: 0, y: 0 }, rotation: 0 }));

            return labelName(level.requireEntity(id));
        });

        expect(names).toEqual(['Rectangle 1', 'Circle 5', 'Polygon 1', 'Line 1', 'Rectangle 2']);
    });

    test('undo removes the shape and redo brings it back with the same id', () => {
        const { session, level } = buildSession();
        let id: ReturnType<typeof requireCreated> | undefined;

        const trip = expectRoundTrip(session, () => {
            id = requireCreated(draw(session, RECTANGLE));
        });

        if (id === undefined) throw new Error('No shape.');
        expect(trip.afterUndo).toEqual(trip.before);
        expect(trip.afterRedo).toEqual(trip.after);
        expect(level.findEntity(id)).toBeDefined();
        session.openLevel.editor.undo();
        expect(level.findEntity(id)).toBeUndefined();
    });

    test('goes on top of the current group, made in the group’s own space', () => {
        const { session, group } = buildSession();
        session.openLevel.currentGroup.enter(group);

        const id = requireCreated(draw(session, RECTANGLE));

        const shape = session.openLevel.level.requireEntity(id);
        expect(group.children[0]).toBe(shape);
        expect(shape.requireComponent(TransformComponent).get('rotation')).toBe(0);
        const expected = levelMatrixOf(session, group).multiply(new Matrix2D(1, 0, 0, 1, 30, 40));
        expect(matrixDifference(levelMatrixOf(session, shape), expected)).toBeLessThan(1e-9);
    });

    test('is refused inside a locked group, or one inside a locked group, and makes no step', () => {
        const { session, level, group, child } = buildSession();
        const entityCountBefore = level.entityCount;
        group.setLocked(true);

        session.openLevel.currentGroup.enter(group);
        const inLocked = draw(session, RECTANGLE);
        session.openLevel.currentGroup.enter(child);
        const insideLocked = draw(session, RECTANGLE);

        expect(inLocked).toEqual({ kind: 'refused', reason: 'This group is locked' });
        expect(insideLocked).toEqual({ kind: 'refused', reason: 'This group is locked' });
        expect(level.entityCount).toBe(entityCountBefore);
        expect(session.openLevel.history.undoCount).toBe(0);
    });
});
