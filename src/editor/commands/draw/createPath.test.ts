import { describe, expect, test } from 'vitest';

import { PathComponent, StyleComponent, TransformComponent } from '../../../core/components/index.ts';
import type { PathGeometry } from '../../../core/geometry/index.ts';
import { labelName } from '../../../core/level/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { buildCommandTestSession, expectRoundTrip } from '../testing/commandTestSession.ts';
import { createPath } from './createPath.ts';

// A curve from 0, 0 to 200, 100, its handles reaching past the points' box.
const CURVE: PathGeometry = {
    closed: false,
    points: [
        { x: 0, y: 0, handleIn: null, handleOut: { x: 0, y: -50 }, corner: 'smooth' },
        { x: 200, y: 100, handleIn: { x: 0, y: 80 }, handleOut: null, corner: 'smooth' },
    ],
};

const TRIANGLE: PathGeometry = {
    closed: true,
    points: [
        { x: 0, y: 0, handleIn: null, handleOut: null, corner: 'sharp' },
        { x: 100, y: 0, handleIn: null, handleOut: null, corner: 'sharp' },
        { x: 0, y: 100, handleIn: null, handleOut: null, corner: 'sharp' },
    ],
};

function buildSession() {
    const timer = new ManualTimer();

    return buildCommandTestSession(timer.clock, timer, new ManualFrames());
}

function requireCreated(outcome: ReturnType<typeof createPath>) {
    if (outcome.kind !== 'created') throw new Error(`Refused: ${outcome.reason}`);

    return outcome.id;
}

describe('createPath', () => {
    test('makes the path around the middle of its points, on top, named Path 1, selected, as one step', () => {
        const { session, level } = buildSession();

        const id = requireCreated(createPath(session.openLevel, session.reader, CURVE));

        const path = level.requireEntity(id);
        expect(level.world.children[0]).toBe(path);
        expect(labelName(path)).toBe('Path 1');
        expect(path.requireComponent(TransformComponent).get('position')).toEqual({ x: 100, y: 50 });
        expect(path.requireComponent(PathComponent).get('path')).toEqual({
            closed: false,
            points: [
                { x: -100, y: -50, handleIn: null, handleOut: { x: 0, y: -50 }, corner: 'smooth' },
                { x: 100, y: 50, handleIn: { x: 0, y: 80 }, handleOut: null, corner: 'smooth' },
            ],
        });
        expect(path.requireComponent(StyleComponent).get('fill')).toEqual(new StyleComponent().get('fill'));
        expect(session.openLevel.selection.ids).toEqual([id]);
        expect(session.openLevel.history.undoCount).toBe(1);
        expect(session.openLevel.history.undoLabel).toBe('Draw Path 1');
    });

    test('counts on from the highest Path number', () => {
        const { session, level } = buildSession();

        requireCreated(createPath(session.openLevel, session.reader, CURVE));
        const second = requireCreated(createPath(session.openLevel, session.reader, CURVE));

        expect(labelName(level.requireEntity(second))).toBe('Path 2');
    });

    test('undo removes the path and redo brings it back', () => {
        const { session } = buildSession();

        const trip = expectRoundTrip(session, () => {
            requireCreated(createPath(session.openLevel, session.reader, TRIANGLE));
        });

        expect(trip.afterUndo).toEqual(trip.before);
        expect(trip.afterRedo).toEqual(trip.after);
    });

    test('is refused inside a locked group and makes no step', () => {
        const { session, group } = buildSession();
        group.setLocked(true);
        session.openLevel.currentGroup.enter(group);

        const outcome = createPath(session.openLevel, session.reader, CURVE);

        expect(outcome).toEqual({ kind: 'refused', reason: 'This group is locked' });
        expect(session.openLevel.history.undoCount).toBe(0);
    });
});
