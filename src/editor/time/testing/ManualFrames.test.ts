import { describe, expect, test } from 'vitest';
import { ManualFrames } from './ManualFrames.ts';

describe('ManualFrames', () => {
    test('runs a callback only when a frame runs', () => {
        const frames = new ManualFrames();
        const times: number[] = [];

        frames.nextFrame((timeMs) => times.push(timeMs));

        expect(times).toEqual([]);
        expect(frames.pendingCount).toBe(1);

        frames.runFrame(16);

        expect(times).toEqual([16]);
        expect(frames.pendingCount).toBe(0);
    });

    test('a cancelled callback never runs', () => {
        const frames = new ManualFrames();
        let calls = 0;

        const cancel = frames.nextFrame(() => (calls += 1));
        cancel();
        frames.runFrame();

        expect(calls).toBe(0);
        expect(frames.pendingCount).toBe(0);
    });

    test('a callback asked for during a frame waits for the next one', () => {
        const frames = new ManualFrames();
        let calls = 0;

        frames.nextFrame(() => frames.nextFrame(() => (calls += 1)));
        frames.runFrame();

        expect(calls).toBe(0);
        expect(frames.pendingCount).toBe(1);

        frames.runFrame();

        expect(calls).toBe(1);
    });
});
