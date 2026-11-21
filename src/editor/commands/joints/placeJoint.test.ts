import { describe, expect, test } from 'vitest';

import {
    JointComponent,
    NameComponent,
    PathComponent,
    StyleComponent,
    TransformComponent,
} from '../../../core/components/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import { labelName } from '../../../core/level/index.ts';
import type { Entity, EntityId } from '../../../core/level/index.ts';
import { jointPathPoints } from '../../../core/physics/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { setFieldValue } from '../entity-inspector/setFieldValue.ts';
import { nudgeSelection } from '../move/nudgeSelection.ts';
import { SelectionMove } from '../move/SelectionMove.ts';
import { buildCommandTestSession, expectRoundTrip } from '../testing/commandTestSession.ts';
import { levelMatrixOf } from '../testing/levelMatrices.ts';
import { placeJoint } from './placeJoint.ts';
import type { JointPlacement } from './placeJoint.ts';

type Built = ReturnType<typeof buildSession>;

// The command test level with a wheel at 200, 0 and a car at 400, 0 on top.
function buildSession() {
    const timer = new ManualTimer();
    const built = buildCommandTestSession(timer.clock, timer, new ManualFrames());
    const { level } = built;

    const named = (name: string, position: Point) => {
        const entity = level.createEntity(level.world, 0);
        entity.addComponent(new TransformComponent({ ...TransformComponent.schema.defaults(), position }));
        entity.addComponent(new NameComponent({ name }));

        return entity;
    };
    const car = named('Car', { x: 400, y: 0 });
    const wheel = named('Wheel', { x: 200, y: 0 });

    return { ...built, car, wheel };
}

function place(built: Built, placement: JointPlacement) {
    const outcome = placeJoint(built.session.openLevel, built.session.reader, placement);
    if (outcome.kind !== 'placed') throw new Error(`Refused: ${outcome.reason}`);

    return built.level.requireEntity(outcome.id);
}

function hingeAt(built: Built, at: Point): JointPlacement {
    return { type: 'hinge', a: built.wheel.id, b: built.car.id, at };
}

function ropeBetween(built: Built, endA: Point, endB: Point): JointPlacement {
    return { type: 'rope', a: built.wheel.id, b: built.car.id, endA, endB };
}

// Where the joint's two ends are in the level.
function levelEnds(built: Built, joint: Entity) {
    const matrix = levelMatrixOf(built.session, joint);
    const ends = joint.requireComponent(JointComponent).get('ends');

    return { a: matrix.apply(ends.a), b: matrix.apply(ends.b) };
}

function expectNear(actual: Point, expected: Point) {
    expect(actual.x).toBeCloseTo(expected.x, 9);
    expect(actual.y).toBeCloseTo(expected.y, 9);
}

describe('placeJoint', () => {
    test('places a Hinge at its point, on top of the World, selected, as one step', () => {
        const built = buildSession();
        const { session, level, wheel, car } = built;

        const hinge = place(built, hingeAt(built, { x: 210, y: 5 }));

        expect(level.world.children[0]).toBe(hinge);
        expect(labelName(hinge)).toBe('Hinge 1');
        const transform = hinge.requireComponent(TransformComponent);
        expect(transform.get('position')).toEqual({ x: 210, y: 5 });
        expect(transform.get('rotation')).toBe(0);
        expect(transform.get('scale')).toEqual({ x: 1, y: 1 });
        const joint = hinge.requireComponent(JointComponent);
        expect(joint.get('type')).toBe('hinge');
        expect(joint.get('a')).toBe(wheel.id);
        expect(joint.get('b')).toBe(car.id);
        expect(joint.get('letConnectedObjectsCollide')).toBe(false);
        expect(joint.get('ends')).toEqual({ a: { x: 0, y: 0 }, b: { x: 0, y: 0 } });
        expect(hinge.getComponent(PathComponent)).toBeUndefined();
        expect(session.openLevel.selection.ids).toEqual([hinge.id]);
        expect(session.openLevel.history.undoCount).toBe(1);
        expect(session.openLevel.history.undoLabel).toBe('Place Hinge 1');
    });

    test('places a Rope halfway between its ends, with the drawn gap, a straight path and no style', () => {
        const built = buildSession();

        const rope = place(built, ropeBetween(built, { x: 200, y: 0 }, { x: 260, y: 80 }));

        expect(labelName(rope)).toBe('Rope 1');
        expect(rope.requireComponent(TransformComponent).get('position')).toEqual({ x: 230, y: 40 });
        const joint = rope.requireComponent(JointComponent);
        expect(joint.get('ends')).toEqual({ a: { x: -30, y: -40 }, b: { x: 30, y: 40 } });
        expect(joint.get('letConnectedObjectsCollide')).toBe(true);
        expect(joint.get('matchDrawnDistance')).toBe(true);
        expect(joint.get('length')).toBe(100);
        expect(joint.get('restLength')).toBe(100);
        const path = rope.requireComponent(PathComponent).get('path');
        expect(path).toEqual(jointPathPoints('rope', { x: -30, y: -40 }, { x: 30, y: 40 }));
        expect(rope.getComponent(StyleComponent)).toBeUndefined();
    });

    test('gives a Spring its zigzag, and an empty B pins to the background', () => {
        const built = buildSession();
        const placement: JointPlacement = {
            type: 'spring',
            a: built.wheel.id,
            b: null,
            endA: { x: 0, y: 0 },
            endB: { x: 0, y: 50 },
        };

        const spring = place(built, placement);

        expect(labelName(spring)).toBe('Spring 1');
        const joint = spring.requireComponent(JointComponent);
        expect(joint.get('b')).toBeNull();
        expect(joint.get('restLength')).toBe(50);
        const path = spring.requireComponent(PathComponent).get('path');
        expect(path).toEqual(jointPathPoints('spring', { x: 0, y: -25 }, { x: 0, y: 25 }));
    });

    test('keeps a drawn gap inside Length’s range', () => {
        const built = buildSession();

        const rope = place(built, ropeBetween(built, { x: 5, y: 5 }, { x: 5, y: 5 }));

        expect(rope.requireComponent(JointComponent).get('length')).toBe(1);
    });

    test('names each type one more than the highest number used with its word', () => {
        const built = buildSession();

        const names = [
            place(built, hingeAt(built, { x: 0, y: 0 })),
            place(built, ropeBetween(built, { x: 0, y: 0 }, { x: 10, y: 0 })),
            place(built, hingeAt(built, { x: 0, y: 0 })),
        ].map((joint) => labelName(joint));

        // The command test level already has a joint named plain "Rope", which has no number.
        expect(names).toEqual(['Hinge 1', 'Rope 1', 'Hinge 2']);
    });

    test('undo removes the joint and redo brings it back with the same id', () => {
        const built = buildSession();
        let id: EntityId | undefined;

        const trip = expectRoundTrip(built.session, () => {
            id = place(built, hingeAt(built, { x: 210, y: 5 })).id;
        });

        if (id === undefined) throw new Error('No joint.');
        expect(trip.afterUndo).toEqual(trip.before);
        expect(trip.afterRedo).toEqual(trip.after);
        expect(built.level.findEntity(id)).toBeDefined();
        built.session.openLevel.editor.undo();
        expect(built.level.findEntity(id)).toBeUndefined();
    });

    test('under a rotated, scaled and skewed group, puts its ends where they were clicked', () => {
        const built = buildSession();
        built.session.openLevel.currentGroup.enter(built.group);
        const endA = { x: 150, y: 70 };
        const endB = { x: 230, y: 20 };

        const rope = place(built, ropeBetween(built, endA, endB));
        const hinge = place(built, hingeAt(built, { x: 120, y: 90 }));

        expect(built.group.children.slice(0, 2)).toEqual([hinge, rope]);
        const ropeEnds = levelEnds(built, rope);
        expectNear(ropeEnds.a, endA);
        expectNear(ropeEnds.b, endB);
        expectNear(levelEnds(built, hinge).a, { x: 120, y: 90 });
        expect(rope.requireComponent(TransformComponent).get('rotation')).toBe(0);
    });

    test('is refused inside a locked group, or one inside a locked group, and makes no step', () => {
        const built = buildSession();
        const { session, level, group, child } = built;
        const entityCountBefore = level.entityCount;
        group.setLocked(true);

        session.openLevel.currentGroup.enter(group);
        const inLocked = placeJoint(session.openLevel, session.reader, hingeAt(built, { x: 0, y: 0 }));
        session.openLevel.currentGroup.enter(child);
        const insideLocked = placeJoint(session.openLevel, session.reader, hingeAt(built, { x: 0, y: 0 }));

        expect(inLocked).toEqual({ kind: 'refused', reason: 'This group is locked' });
        expect(insideLocked).toEqual({ kind: 'refused', reason: 'This group is locked' });
        expect(level.entityCount).toBe(entityCountBefore);
        expect(session.openLevel.history.undoCount).toBe(0);
    });

    test('copying the joint with its bodies joins the copies to each other', () => {
        const built = buildSession();
        const { session, wheel, car } = built;
        const hinge = place(built, hingeAt(built, { x: 210, y: 5 }));
        session.openLevel.selection.replace([hinge.id, wheel.id, car.id]);

        const outcome = built.requireCommand('edit.duplicate').run();

        expect(outcome).toEqual({ kind: 'done', skipped: [] });
        const copies = session.openLevel.selection.entities;
        const [hingeCopy, wheelCopy, carCopy] = copies;
        if (hingeCopy === undefined || wheelCopy === undefined || carCopy === undefined) throw new Error('No copies.');
        expect(labelName(wheelCopy)).toBe('Wheel');
        expect(labelName(carCopy)).toBe('Car');
        const joint = hingeCopy.requireComponent(JointComponent);
        expect(joint.get('a')).toBe(wheelCopy.id);
        expect(joint.get('b')).toBe(carCopy.id);
    });

    test("moving one body alone carries the Rope's end on it, centres the Rope again and redraws its path", () => {
        const built = buildSession();
        const { session, wheel } = built;
        const rope = place(built, ropeBetween(built, { x: 200, y: 0 }, { x: 400, y: 0 }));
        session.openLevel.selection.replace([wheel.id]);

        nudgeSelection(session.openLevel, { x: 0, y: 30 });

        expect(wheel.requireComponent(TransformComponent).get('position')).toEqual({ x: 200, y: 30 });
        expect(rope.requireComponent(TransformComponent).get('position')).toEqual({ x: 300, y: 15 });
        expect(levelEnds(built, rope)).toEqual({ a: { x: 200, y: 30 }, b: { x: 400, y: 0 } });
        const pathPoints = rope.requireComponent(PathComponent).get('path').points;
        expect(pathPoints.map((point) => ({ x: point.x, y: point.y }))).toEqual([
            { x: -100, y: 15 },
            { x: 100, y: -15 },
        ]);

        session.openLevel.editor.undo();
        expect(rope.requireComponent(TransformComponent).get('position')).toEqual({ x: 300, y: 0 });
        expect(levelEnds(built, rope)).toEqual({ a: { x: 200, y: 0 }, b: { x: 400, y: 0 } });
    });

    test('moving the Rope alone carries both its ends, as before', () => {
        const built = buildSession();
        const { session } = built;
        const rope = place(built, ropeBetween(built, { x: 200, y: 0 }, { x: 400, y: 0 }));
        session.openLevel.selection.replace([rope.id]);

        nudgeSelection(session.openLevel, { x: 0, y: 30 });

        expect(levelEnds(built, rope)).toEqual({ a: { x: 200, y: 30 }, b: { x: 400, y: 30 } });
    });
});

describe('Rope and Spring ends follow the entities they join', () => {
    test('a typed position carries the end, as one step with the typing', () => {
        const built = buildSession();
        const { session, car } = built;
        const springPlacement: JointPlacement = {
            type: 'spring',
            a: built.wheel.id,
            b: car.id,
            endA: { x: 200, y: 0 },
            endB: { x: 400, y: 0 },
        };
        const spring = place(built, springPlacement);

        setFieldValue(session.openLevel, [car.id], 'TransformComponent', 'position', { x: 400, y: 100 });

        expect(levelEnds(built, spring)).toEqual({ a: { x: 200, y: 0 }, b: { x: 400, y: 100 } });
        const ends = spring.requireComponent(JointComponent).get('ends');
        const path = spring.requireComponent(PathComponent).get('path');
        expect(path).toEqual(jointPathPoints('spring', ends.a, ends.b));

        session.openLevel.editor.undo();
        expect(levelEnds(built, spring)).toEqual({ a: { x: 200, y: 0 }, b: { x: 400, y: 0 } });
    });

    test('a drag carries the end as it goes, and Esc puts the joint back', () => {
        const built = buildSession();
        const { session, wheel } = built;
        const rope = place(built, ropeBetween(built, { x: 200, y: 0 }, { x: 400, y: 0 }));
        session.openLevel.selection.replace([wheel.id]);
        const move = SelectionMove.ofSelection(session.openLevel);
        if (!(move instanceof SelectionMove)) throw new Error('Nothing to move.');
        session.openLevel.liveEdit.begin(move.targets);

        move.moveBy({ x: -50, y: 0 });
        expect(levelEnds(built, rope).a).toEqual({ x: 150, y: 0 });

        move.moveBy({ x: 0, y: 0 });
        expect(levelEnds(built, rope).a).toEqual({ x: 200, y: 0 });
        expect(rope.requireComponent(TransformComponent).get('position')).toEqual({ x: 300, y: 0 });

        move.moveBy({ x: -50, y: 0 });
        session.openLevel.liveEdit.cancel();
        expect(rope.requireComponent(TransformComponent).get('position')).toEqual({ x: 300, y: 0 });
        expect(levelEnds(built, rope)).toEqual({ a: { x: 200, y: 0 }, b: { x: 400, y: 0 } });
    });

    test('an end on a turned entity turns with it, and one on a moved group moves with it', () => {
        const built = buildSession();
        const { session, level, wheel, car } = built;
        const rope = place(built, ropeBetween(built, { x: 210, y: 0 }, { x: 400, y: 0 }));

        setFieldValue(session.openLevel, [wheel.id], 'TransformComponent', 'rotation', 90);
        expectNear(levelEnds(built, rope).a, { x: 200, y: 10 });

        const group = level.createEntity(level.world, 0);
        group.addComponent(new TransformComponent());
        level.moveEntity(car, group, 0);
        setFieldValue(session.openLevel, [group.id], 'TransformComponent', 'position', { x: 0, y: 40 });
        expectNear(levelEnds(built, rope).b, { x: 400, y: 40 });
    });
});
