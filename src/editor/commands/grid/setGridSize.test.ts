import { describe, expect, test } from 'vitest';

import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { buildCommandTestSession, expectRoundTrip } from '../testing/commandTestSession.ts';

import { GRID_SIZE_NOT_A_NUMBER, setGridSize } from './setGridSize.ts';

function buildSession() {
    const timer = new ManualTimer();

    return buildCommandTestSession(timer.clock, timer, new ManualFrames());
}

describe('setGridSize', () => {
    test('sets the grid size as one undo step, passing the run, undo, redo round trip', () => {
        const { session } = buildSession();
        const editorData = session.openLevel.level.editorData;

        const trip = expectRoundTrip(session, () => setGridSize(session.openLevel, ' 25 '));

        expect(trip.afterUndo).toEqual(trip.before);
        expect(trip.afterRedo).toEqual(trip.after);
        expect(editorData.gridSize).toBe(25);
        expect(session.openLevel.history.undoLabel).toBe('Change grid size');
    });

    test('takes a px after the number, rounds a decimal and keeps a size inside 5 to 1,000', () => {
        const { session } = buildSession();
        const editorData = session.openLevel.level.editorData;

        setGridSize(session.openLevel, '32px');
        expect(editorData.gridSize).toBe(32);
        setGridSize(session.openLevel, '12.6');
        expect(editorData.gridSize).toBe(13);
        setGridSize(session.openLevel, '2');
        expect(editorData.gridSize).toBe(5);
        setGridSize(session.openLevel, '5000');
        expect(editorData.gridSize).toBe(1000);
    });

    test('refuses what is not a number, and the same size makes no step', () => {
        const { session } = buildSession();
        const before = session.openLevel.level.editorData.gridSize;

        expect(setGridSize(session.openLevel, 'big')).toEqual({ kind: 'refused', reason: GRID_SIZE_NOT_A_NUMBER });
        expect(setGridSize(session.openLevel, '')).toEqual({ kind: 'refused', reason: GRID_SIZE_NOT_A_NUMBER });
        expect(setGridSize(session.openLevel, String(before))).toEqual({ kind: 'done' });
        expect(session.openLevel.history.undoCount).toBe(0);
    });
});
