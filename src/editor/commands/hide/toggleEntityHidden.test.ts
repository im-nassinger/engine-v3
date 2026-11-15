import { describe, expect, test } from 'vitest';

import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { buildCommandTestSession, expectRoundTrip } from '../testing/commandTestSession.ts';

import { toggleEntityHidden } from './toggleEntityHidden.ts';

function buildSession() {
    const timer = new ManualTimer();

    return buildCommandTestSession(timer.clock, timer, new ManualFrames());
}

describe('toggleEntityHidden', () => {
    test('hides only its own row, not the selection, in one step', () => {
        const { session, square, rope } = buildSession();
        session.openLevel.selection.replace([square.id, rope.id]);

        const trip = expectRoundTrip(session, () => toggleEntityHidden(session.openLevel, square.id));

        expect(trip.afterUndo).toEqual(trip.before);
        expect(trip.afterRedo).toEqual(trip.after);
        expect(square.isHidden).toBe(true);
        expect(rope.isHidden).toBe(false);
        expect(session.openLevel.history.undoCount).toBe(1);
        expect(session.openLevel.history.undoLabel).toBe('Hide Square');
    });

    test('shows a hidden entity again', () => {
        const { session, square } = buildSession();

        toggleEntityHidden(session.openLevel, square.id);
        toggleEntityHidden(session.openLevel, square.id);

        expect(square.isHidden).toBe(false);
        expect(session.openLevel.history.undoLabel).toBe('Show Square');
    });

    test("doesn't change the selection", () => {
        const { session, square, group } = buildSession();
        session.openLevel.selection.replace([group.id]);

        toggleEntityHidden(session.openLevel, square.id);

        expect(session.openLevel.selection.ids).toEqual([group.id]);
    });

    test('hides the camera but refuses the World', () => {
        const { session, level } = buildSession();

        toggleEntityHidden(session.openLevel, level.camera.id);
        const outcome = toggleEntityHidden(session.openLevel, level.world.id);

        expect(level.camera.isHidden).toBe(true);
        expect(outcome).toEqual({ kind: 'refused', reason: "The World can't be hidden" });
        expect(level.world.isHidden).toBe(false);
    });
});
