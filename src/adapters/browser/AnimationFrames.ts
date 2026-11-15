import type { Cancel, FrameScheduler } from '../../editor/time/index.ts';

// The browser's requestAnimationFrame behind the editor's FrameScheduler contract.
export class AnimationFrames implements FrameScheduler {
    nextFrame(callback: (timeMs: number) => void): Cancel {
        const handle = requestAnimationFrame(callback);

        return () => cancelAnimationFrame(handle);
    }
}
