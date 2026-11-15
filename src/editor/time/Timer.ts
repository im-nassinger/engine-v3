import type { Cancel } from './FrameScheduler.ts';

// Calls back once, after a delay. The editor never calls setTimeout itself, so its tests run on ManualTimer.
export type Timer = {
    after(delayMs: number, callback: () => void): Cancel;
};
