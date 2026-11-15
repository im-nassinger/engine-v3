export type Cancel = () => void;

// Calls back once, before the browser's next frame is painted. The editor never calls
// requestAnimationFrame itself, so its tests run on ManualFrames.
export type FrameScheduler = {
    nextFrame(callback: (timeMs: number) => void): Cancel;
};
