import { describe, expect, test } from 'vitest';

import { ManualFrames } from '../../time/testing/index.ts';
import { MousePosition } from './MousePosition.ts';

describe('MousePosition', () => {
    test('shows the last position once a frame, however many moves came', () => {
        const frames = new ManualFrames();
        const mouse = new MousePosition(frames);

        mouse.moveTo({ x: 1, y: 2 });
        mouse.moveTo({ x: 3, y: 4 });
        mouse.moveTo({ x: 5, y: 6 });
        expect(mouse.current).toBeUndefined();
        expect(frames.pendingCount).toBe(1);

        frames.runFrame();
        expect(mouse.current).toEqual({ x: 5, y: 6 });
        expect(mouse.version.version).toBe(1);
    });

    test('leaving the level view shows no position', () => {
        const frames = new ManualFrames();
        const mouse = new MousePosition(frames);

        mouse.moveTo({ x: 1, y: 2 });
        frames.runFrame();
        mouse.leave();
        frames.runFrame();

        expect(mouse.current).toBeUndefined();
        expect(mouse.version.version).toBe(2);
    });

    test('a frame with no change moves nothing', () => {
        const frames = new ManualFrames();
        const mouse = new MousePosition(frames);

        mouse.leave();
        frames.runFrame();

        expect(mouse.version.version).toBe(0);
    });
});
