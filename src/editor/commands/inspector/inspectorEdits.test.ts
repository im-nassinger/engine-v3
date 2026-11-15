import { describe, expect, test } from 'vitest';

import { BodyComponent, ShapeComponent, SurfaceComponent, TransformComponent } from '../../../core/components/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { buildCommandTestSession, expectRoundTrip } from '../testing/commandTestSession.ts';

import { addComponent } from './addComponent.ts';
import { removeComponent } from './removeComponent.ts';
import { resetComponent } from './resetComponent.ts';
import { setFieldValue, setVectorAxis } from './setFieldValue.ts';

// The square and the child as crates: a shape, a body and a surface each.
function buildSession() {
    const timer = new ManualTimer();
    const built = buildCommandTestSession(timer.clock, timer, new ManualFrames());

    for (const crate of [built.square, built.child]) {
        crate.addComponent(new ShapeComponent());
        crate.addComponent(new BodyComponent());
        crate.addComponent(new SurfaceComponent());
    }

    return built;
}

function dampingOf(entity: Entity) {
    return entity.requireComponent(BodyComponent).get('linearDamping');
}

describe('setFieldValue', () => {
    test('changes a field on several entities in one step, passing the round trip', () => {
        const { session, square, child } = buildSession();
        const ids = [square.id, child.id];

        const trip = expectRoundTrip(session, () =>
            setFieldValue(session.openLevel, ids, 'BodyComponent', 'linearDamping', 2),
        );

        expect(trip.afterUndo).toEqual(trip.before);
        expect(trip.afterRedo).toEqual(trip.after);
        expect(dampingOf(square)).toBe(2);
        expect(dampingOf(child)).toBe(2);
        expect(session.openLevel.history.undoCount).toBe(1);
        expect(session.openLevel.history.undoLabel).toBe('Change Linear damping');
    });

    test('leaves out entities without the component', () => {
        const { session, square, group } = buildSession();

        setFieldValue(session.openLevel, [square.id, group.id], 'BodyComponent', 'linearDamping', 3);

        expect(dampingOf(square)).toBe(3);
        expect(group.hasComponent(BodyComponent)).toBe(false);
    });

    test('makes no step for a value every entity already holds', () => {
        const { session, square } = buildSession();

        const outcome = setFieldValue(session.openLevel, [square.id], 'BodyComponent', 'linearDamping', 0);

        expect(outcome).toEqual({ kind: 'done' });
        expect(session.openLevel.history.undoCount).toBe(0);
    });

    test('writes a derived field through its write, as one step', () => {
        const { session, square } = buildSession();

        const trip = expectRoundTrip(session, () =>
            setFieldValue(session.openLevel, [square.id], 'ShapeComponent', 'width', 250),
        );

        expect(trip.afterUndo).toEqual(trip.before);
        expect(trip.afterRedo).toEqual(trip.after);
        expect(square.requireComponent(ShapeComponent).get('geometry')).toEqual({
            kind: 'rectangle',
            width: 250,
            height: 100,
        });
        expect(session.openLevel.history.undoLabel).toBe('Change Width');
    });

    test('refuses a derived write with its reason and makes no step', () => {
        const { session, square } = buildSession();
        const points = [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
        ];
        setFieldValue(session.openLevel, [square.id], 'ShapeComponent', 'kind', 'polygon');
        const stepsBefore = session.openLevel.history.undoCount;

        const outcome = setFieldValue(session.openLevel, [square.id], 'ShapeComponent', 'points', points);

        expect(outcome).toEqual({ kind: 'refused', reason: 'Points needs at least 3' });
        expect(session.openLevel.history.undoCount).toBe(stepsBefore);
    });

    test('refuses the whole edit when one entity refuses it', () => {
        const { session, square, child } = buildSession();
        setFieldValue(session.openLevel, [child.id], 'ShapeComponent', 'kind', 'line');
        const line = child.requireComponent(ShapeComponent);
        line.writeDerived('points', [
            { x: 0, y: 0 },
            { x: 10, y: 5 },
        ]);
        const stepsBefore = session.openLevel.history.undoCount;

        const outcome = setFieldValue(session.openLevel, [square.id, child.id], 'ShapeComponent', 'kind', 'polygon');

        expect(outcome).toEqual({ kind: 'refused', reason: 'A polygon needs at least 3 points' });
        expect(square.requireComponent(ShapeComponent).get('geometry').kind).toBe('rectangle');
        expect(session.openLevel.history.undoCount).toBe(stepsBefore);
    });

    test('changing Kind keeps the shape in place, moving its Position by the offset through its matrix', () => {
        const { session, square } = buildSession();
        const transform = square.requireComponent(TransformComponent);
        transform.set('position', { x: 10, y: 20 });
        transform.set('rotation', 90);
        transform.set('scale', { x: 2, y: 2 });
        const shape = square.requireComponent(ShapeComponent);
        shape.set('geometry', {
            kind: 'polygon',
            points: [
                { x: 0, y: 0 },
                { x: 40, y: 0 },
                { x: 40, y: 20 },
            ],
        });

        const trip = expectRoundTrip(session, () =>
            setFieldValue(session.openLevel, [square.id], 'ShapeComponent', 'kind', 'rectangle'),
        );

        expect(trip.afterUndo).toEqual(trip.before);
        expect(trip.afterRedo).toEqual(trip.after);
        expect(shape.get('geometry')).toEqual({ kind: 'rectangle', width: 40, height: 20 });
        // The bounds' centre (20, 10) in the shape's own space, turned 90° and doubled: (-20, 40) from (10, 20).
        const position = transform.get('position');
        expect(position.x).toBeCloseTo(-10, 9);
        expect(position.y).toBeCloseTo(60, 9);
        expect(session.openLevel.history.undoCount).toBe(1);
        expect(session.openLevel.history.undoLabel).toBe('Change Kind');
    });

    test('changing Kind to the kind it already is makes no step', () => {
        const { session, square } = buildSession();

        setFieldValue(session.openLevel, [square.id], 'ShapeComponent', 'kind', 'rectangle');

        expect(session.openLevel.history.undoCount).toBe(0);
    });
});

describe('setVectorAxis', () => {
    test('sets one axis on several entities in one step, each keeping its other axis', () => {
        const { session, square, child } = buildSession();
        square.requireComponent(TransformComponent).set('position', { x: 1, y: 20 });
        child.requireComponent(TransformComponent).set('position', { x: 2, y: 30 });
        const ids = [square.id, child.id];

        const trip = expectRoundTrip(session, () =>
            setVectorAxis(session.openLevel, ids, 'TransformComponent', 'position', 'x', 5),
        );

        expect(trip.afterUndo).toEqual(trip.before);
        expect(trip.afterRedo).toEqual(trip.after);
        expect(square.requireComponent(TransformComponent).get('position')).toEqual({ x: 5, y: 20 });
        expect(child.requireComponent(TransformComponent).get('position')).toEqual({ x: 5, y: 30 });
        expect(session.openLevel.history.undoCount).toBe(1);
        expect(session.openLevel.history.undoLabel).toBe('Change Position');
    });

    test('refuses a scale of 0 in either axis and makes no step', () => {
        const { session, square } = buildSession();

        const outcome = setVectorAxis(session.openLevel, [square.id], 'TransformComponent', 'scale', 'y', 0);

        expect(outcome.kind).toBe('refused');
        expect(square.requireComponent(TransformComponent).get('scale')).toEqual({ x: 1, y: 1 });
        expect(session.openLevel.history.undoCount).toBe(0);
    });
});

describe('addComponent', () => {
    test('adds only where it is missing, in one step, passing the round trip', () => {
        const { session, square, group } = buildSession();
        group.addComponent(new BodyComponent({ ...BodyComponent.schema.defaults(), linearDamping: 4 }));
        const ids = [square.id, group.id];

        const trip = expectRoundTrip(session, () => addComponent(session.openLevel, ids, ShapeComponent));
        addComponent(session.openLevel, ids, BodyComponent);

        expect(trip.afterUndo).toEqual(trip.before);
        expect(trip.afterRedo).toEqual(trip.after);
        expect(group.hasComponent(ShapeComponent)).toBe(true);
        expect(dampingOf(group)).toBe(4);
        expect(session.openLevel.history.undoLabel).toBe('Add ShapeComponent');
        expect(session.openLevel.history.undoCount).toBe(1);
    });
});

describe('removeComponent', () => {
    test('removes only that component and keeps its partners, passing the round trip', () => {
        const { session, square, child } = buildSession();
        square.requireComponent(SurfaceComponent).set('friction', 0.9);

        const trip = expectRoundTrip(session, () =>
            removeComponent(session.openLevel, [square.id, child.id], 'ShapeComponent'),
        );

        expect(trip.afterUndo).toEqual(trip.before);
        expect(trip.afterRedo).toEqual(trip.after);
        expect(square.hasComponent(ShapeComponent)).toBe(false);
        expect(child.hasComponent(ShapeComponent)).toBe(false);
        expect(square.requireComponent(SurfaceComponent).get('friction')).toBe(0.9);
        expect(session.openLevel.history.undoLabel).toBe('Remove ShapeComponent');
    });

    test('makes no step when none has it', () => {
        const { session, group } = buildSession();

        removeComponent(session.openLevel, [group.id], 'BodyComponent');

        expect(session.openLevel.history.undoCount).toBe(0);
    });
});

describe('resetComponent', () => {
    test('resets the fields on several entities in one step, passing the round trip', () => {
        const { session, square, child } = buildSession();
        square.requireComponent(BodyComponent).set('linearDamping', 3);
        child.requireComponent(BodyComponent).set('bullet', true);

        const trip = expectRoundTrip(session, () =>
            resetComponent(session.openLevel, [square.id, child.id], 'BodyComponent'),
        );

        expect(trip.afterUndo).toEqual(trip.before);
        expect(trip.afterRedo).toEqual(trip.after);
        expect(dampingOf(square)).toBe(0);
        expect(child.requireComponent(BodyComponent).get('bullet')).toBe(false);
        expect(session.openLevel.history.undoLabel).toBe('Reset BodyComponent');
    });

    test('makes no step when the fields are already at their defaults', () => {
        const { session, square } = buildSession();

        resetComponent(session.openLevel, [square.id], 'BodyComponent');

        expect(session.openLevel.history.undoCount).toBe(0);
    });

    test('refuses a component with no field of its own, keeping its geometry', () => {
        const { session, square } = buildSession();
        setFieldValue(session.openLevel, [square.id], 'ShapeComponent', 'width', 30);

        const outcome = resetComponent(session.openLevel, [square.id], 'ShapeComponent');

        expect(outcome).toEqual({ kind: 'refused', reason: 'Nothing to reset' });
        expect(square.requireComponent(ShapeComponent).get('geometry')).toEqual({
            kind: 'rectangle',
            width: 30,
            height: 100,
        });
    });
});
