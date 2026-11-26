import { describe, expect, test } from 'vitest';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { LengthDisplay } from '../../units/index.ts';
import { buildCommandTestSession } from '../testing/commandTestSession.ts';
import { GRID_SIZE_NOT_A_NUMBER, setGridSize } from './setGridSize.ts';

const METRES = new LengthDisplay('metres', 100);
const PIXELS = new LengthDisplay('pixels', 100);

function buildSession() {
    const timer = new ManualTimer();
    return buildCommandTestSession(timer.clock, timer, new ManualFrames());
}

describe('setGridSize', () => {
    test('sets the grid size typed in metres, which is never an undo step', () => {
        const { session } = buildSession();
        const editorData = session.openLevel.level.editorData;

        const outcome = setGridSize(session.openLevel, ' 0.25 ', METRES);

        expect(outcome).toEqual({ kind: 'done' });
        expect(editorData.gridSize).toBe(25);
        expect(session.openLevel.history.undoCount).toBe(0);
    });

    test('in metres, takes an m after the number, steps of 0.01 m and 0.05 to 10 m', () => {
        const { session } = buildSession();
        const editorData = session.openLevel.level.editorData;

        setGridSize(session.openLevel, '0.32m', METRES);
        expect(editorData.gridSize).toBe(32);
        setGridSize(session.openLevel, '0.126', METRES);
        expect(editorData.gridSize).toBe(13);
        setGridSize(session.openLevel, '0.02', METRES);
        expect(editorData.gridSize).toBe(5);
        setGridSize(session.openLevel, '50', METRES);
        expect(editorData.gridSize).toBe(1000);
    });

    test('in pixels, takes whole pixels with px after them, 5 to 1,000', () => {
        const { session } = buildSession();
        const editorData = session.openLevel.level.editorData;

        setGridSize(session.openLevel, '32px', PIXELS);
        expect(editorData.gridSize).toBe(32);
        setGridSize(session.openLevel, '12.6', PIXELS);
        expect(editorData.gridSize).toBe(13);
        setGridSize(session.openLevel, '2', PIXELS);
        expect(editorData.gridSize).toBe(5);
        setGridSize(session.openLevel, '5000', PIXELS);
        expect(editorData.gridSize).toBe(1000);
    });

    test('in metres at 50 px per metre, 1 m is 50 px', () => {
        const { session } = buildSession();
        const halfScale = new LengthDisplay('metres', 50);

        setGridSize(session.openLevel, '1', halfScale);

        expect(session.openLevel.level.editorData.gridSize).toBe(50);
    });

    test('refuses what is not a number, and the same size makes no step', () => {
        const { session } = buildSession();
        const before = session.openLevel.level.editorData.gridSize;

        expect(setGridSize(session.openLevel, 'big', METRES)).toEqual({
            kind: 'refused',
            reason: GRID_SIZE_NOT_A_NUMBER,
        });
        expect(setGridSize(session.openLevel, '', METRES)).toEqual({ kind: 'refused', reason: GRID_SIZE_NOT_A_NUMBER });
        expect(setGridSize(session.openLevel, String(before), PIXELS)).toEqual({ kind: 'done' });
        expect(session.openLevel.history.undoCount).toBe(0);
    });
});
