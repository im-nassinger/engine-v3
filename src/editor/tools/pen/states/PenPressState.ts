import type { LevelPointerInput, ToolKey } from '../../Tool.ts';
import { sharpPoint } from '../penPoints.ts';

import { PenHandleState, SPACE_CODE } from './PenHandleState.ts';
import type { PenPlacing, PenPress, PenState, PenStateHost } from './PenState.ts';

// The requirement's "a press that moves less than 4 px is a click", in screen pixels.
export const DRAG_START_PX = 4;

// A left press, until it moves 4 screen px, a handle drag, or is released, a click: a sharp point, or the
// path closed when the press was on its first point.
export class PenPressState implements PenState {
    readonly isPressed = true;
    private readonly host: PenStateHost;
    private readonly press: PenPress;

    constructor(host: PenStateHost, press: PenPress) {
        this.host = host;
        this.press = press;
    }

    get placing(): PenPlacing | undefined {
        if (this.press.closing !== undefined) return undefined;

        return { kind: 'adding', point: sharpPoint(this.press.place) };
    }

    pointerDown() {}

    pointerMove(input: LevelPointerInput) {
        const from = this.press.input.screenPosition;
        const distance = Math.hypot(input.screenPosition.x - from.x, input.screenPosition.y - from.y);
        if (distance < DRAG_START_PX) return;

        this.host.goTo(new PenHandleState(this.host, this.press, input));
    }

    pointerUp(input: LevelPointerInput) {
        if (input.button !== 'left') return;

        const { host, press } = this;
        if (press.closing !== undefined) {
            host.close(press.closing);
            return;
        }

        host.addPoint(sharpPoint(press.place), press.space);
        host.goIdle();
    }

    // Space before the press moved still moves the point, so the drag starts at once.
    keyDown(key: ToolKey) {
        if (key.code !== SPACE_CODE) return false;

        const handle = new PenHandleState(this.host, this.press, this.press.input);
        this.host.goTo(handle);
        handle.keyDown(key);

        return true;
    }

    keyUp() {}

    modifiersChanged() {}

    cancel() {
        this.host.finishKeeping();
    }
}
