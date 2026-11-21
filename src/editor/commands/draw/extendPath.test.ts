import { describe, expect, test } from 'vitest';

import { NameComponent, PathComponent, TransformComponent } from '../../../core/components/index.ts';
import type { PathGeometry, PathPoint } from '../../../core/geometry/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { buildCommandTestSession, expectRoundTrip } from '../testing/commandTestSession.ts';
import { extendPath } from './extendPath.ts';

function sharp(x: number, y: number): PathPoint {
    return { x, y, handleIn: null, handleOut: null, corner: 'sharp' };
}

const LONGER: PathGeometry = { closed: false, points: [sharp(0, 0), sharp(100, 0), sharp(100, 100)] };

function buildSession() {
    const timer = new ManualTimer();
    const setup = buildCommandTestSession(timer.clock, timer, new ManualFrames());
    const path = setup.level.createEntity(setup.level.world, 0);
    path.addComponent(
        new TransformComponent({ position: { x: 50, y: 50 }, rotation: 0, scale: { x: 1, y: 1 }, skew: 0 }),
    );
    path.addComponent(new NameComponent({ name: 'Path 1' }));
    path.addComponent(new PathComponent());

    return { ...setup, path };
}

describe('extendPath', () => {
    test('writes the whole path as one step, Draw on Path 1, keeping its position and the selection', () => {
        const { session, path } = buildSession();
        session.openLevel.selection.replace([path.id]);

        const outcome = extendPath(session.openLevel, path, LONGER);

        expect(outcome).toEqual({ kind: 'extended' });
        expect(path.requireComponent(PathComponent).get('path')).toEqual(LONGER);
        expect(path.requireComponent(TransformComponent).get('position')).toEqual({ x: 50, y: 50 });
        expect(session.openLevel.history.undoCount).toBe(1);
        expect(session.openLevel.history.undoLabel).toBe('Draw on Path 1');
        expect(session.openLevel.selection.ids).toEqual([path.id]);
    });

    test('undo puts the path back and redo writes it again', () => {
        const { session, path } = buildSession();

        const trip = expectRoundTrip(session, () => {
            extendPath(session.openLevel, path, LONGER);
        });

        expect(trip.afterUndo).toEqual(trip.before);
        expect(trip.afterRedo).toEqual(trip.after);
    });

    test('the path as it already was makes no step', () => {
        const { session, path } = buildSession();
        const same = path.requireComponent(PathComponent).get('path');

        extendPath(session.openLevel, path, same);

        expect(session.openLevel.history.undoCount).toBe(0);
    });

    test("a Rope's or Spring's path is refused", () => {
        const { session, rope } = buildSession();

        const outcome = extendPath(session.openLevel, rope, LONGER);

        expect(outcome).toEqual({ kind: 'refused', reason: "A Rope's or Spring's path follows its joint" });
        expect(session.openLevel.history.undoCount).toBe(0);
    });

    test('a path in a locked group is refused', () => {
        const { session, level, group } = buildSession();
        const inside = level.createEntity(group, 0);
        inside.addComponent(new TransformComponent());
        inside.addComponent(new PathComponent());
        group.setLocked(true);

        const outcome = extendPath(session.openLevel, inside, LONGER);

        expect(outcome).toEqual({ kind: 'refused', reason: 'This group is locked' });
    });
});
