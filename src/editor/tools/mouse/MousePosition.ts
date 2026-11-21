import { VersionCounter } from '../../../core/events/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import type { Cancel, FrameScheduler } from '../../time/index.ts';

// Where the mouse is over the level view, in level pixels, for the debug box. It moves at most once a
// frame, however many pointer events come, so the bar redraws at most once a frame. The screen position
// is kept at once, for zooming at the mouse with the keys.
export class MousePosition {
    readonly version = new VersionCounter();
    private readonly frames: FrameScheduler;
    private latest: Point | undefined;
    private latestScreenPosition: Point | undefined;
    private shown: Point | undefined;
    private cancelFrame: Cancel | undefined;

    constructor(frames: FrameScheduler) {
        this.frames = frames;
    }

    // undefined while the mouse is outside the level view.
    get current() {
        return this.shown;
    }

    // undefined while the mouse is outside the level view.
    get screenPosition() {
        return this.latestScreenPosition;
    }

    moveTo(levelPosition: Point, screenPosition?: Point) {
        this.latest = levelPosition;
        this.latestScreenPosition = screenPosition;
        this.showOnNextFrame();
    }

    leave() {
        this.latest = undefined;
        this.latestScreenPosition = undefined;
        this.showOnNextFrame();
    }

    private showOnNextFrame() {
        if (this.cancelFrame !== undefined) return;

        this.cancelFrame = this.frames.nextFrame(() => this.show());
    }

    private show() {
        this.cancelFrame = undefined;
        if (this.shown === this.latest) return;

        this.shown = this.latest;
        this.version.increment();
    }
}
