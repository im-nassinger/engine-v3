import type { PathPoint, Point } from '../../../../core/geometry/index.ts';
import type { LevelPointerInput, Modifiers, ToolKey } from '../../Tool.ts';
import { between, draggedHandle, isZero, mirrored, plus } from '../penPoints.ts';

import type { PenPlacing, PenPress, PenState, PenStateHost } from './PenState.ts';

export const SPACE_CODE = 'Space';

const NO_HANDLE: Point = { x: 0, y: 0 };

// While Space is held: where the point and the mouse were when it went down, in the drawing's space.
type Moving = {
    readonly anchorStart: Point;
    readonly mouseStart: Point;
};

// The press moved 4 px: the point stays at the press and the mouse pulls its handle out, the handle in
// mirrored, so the release places a smooth point. Shift keeps the handle to 15°. Alt breaks the mirror for
// the rest of the drag: the point turns separate and the handle out moves alone. Space moves the point with
// its handles while held. On the first point, the drag shapes the closing curve: the mouse pulls its
// handle out and its handle in follows mirrored, or only its handle in moves with Alt.
export class PenHandleState implements PenState {
    readonly isPressed = true;
    private readonly host: PenStateHost;
    private readonly press: PenPress;
    private anchor: Point;
    private handleIn: Point;
    private handleOut: Point;
    private separate = false;
    private moving: Moving | undefined;
    // The mouse in the drawing's space, for Space and the modifier keys.
    private mouse: Point;

    constructor(host: PenStateHost, press: PenPress, input: LevelPointerInput) {
        this.host = host;
        this.press = press;
        this.anchor = press.place;
        const first = press.closing;
        this.handleIn = first?.handleIn ?? NO_HANDLE;
        this.handleOut = first?.handleOut ?? NO_HANDLE;
        this.mouse = press.space.toGroup.apply(input.levelPosition);
        this.follow(input.levelPosition, input.modifiers);
    }

    get placing(): PenPlacing {
        const point = this.point();
        if (this.press.closing !== undefined) return { kind: 'closing', first: point };

        return { kind: 'adding', point };
    }

    pointerDown() {}

    pointerMove(input: LevelPointerInput) {
        this.follow(input.levelPosition, input.modifiers);
        this.host.redraw();
    }

    // A handle dragged back onto its point leaves a sharp point.
    pointerUp(input: LevelPointerInput) {
        if (input.button !== 'left') return;

        const { host, press } = this;
        const point = this.point();
        if (press.closing !== undefined) {
            host.close(point);
            return;
        }

        host.addPoint(point, press.space);
        host.goIdle();
    }

    // Space is taken while the button is down, so it never starts a pan. Closing moves no point: the first
    // is placed already.
    keyDown(key: ToolKey) {
        if (key.code !== SPACE_CODE) return false;
        if (this.press.closing !== undefined || this.moving !== undefined) return true;

        this.moving = { anchorStart: this.anchor, mouseStart: this.mouse };

        return true;
    }

    keyUp(key: ToolKey) {
        if (key.code !== SPACE_CODE) return;

        this.moving = undefined;
    }

    modifiersChanged(levelPosition: Point, modifiers: Modifiers) {
        this.follow(levelPosition, modifiers);
        this.host.redraw();
    }

    cancel() {
        this.host.finishKeeping();
    }

    private follow(levelPosition: Point, modifiers: Modifiers) {
        this.mouse = this.press.space.toGroup.apply(levelPosition);
        const moving = this.moving;
        if (moving !== undefined) {
            this.anchor = plus(moving.anchorStart, between(moving.mouseStart, this.mouse));
            return;
        }

        if (modifiers.alt) {
            this.separate = true;
        }
        const pulled = draggedHandle(this.anchor, this.mouse, modifiers.shift);
        if (this.press.closing !== undefined) {
            this.handleIn = mirrored(pulled);
            if (!this.separate) {
                this.handleOut = pulled;
            }
            return;
        }

        this.handleOut = pulled;
        if (!this.separate) {
            this.handleIn = mirrored(pulled);
        }
    }

    private point(): PathPoint {
        const { anchor, handleIn, handleOut } = this;
        if (isZero(handleIn) && isZero(handleOut)) {
            return { x: anchor.x, y: anchor.y, handleIn: null, handleOut: null, corner: 'sharp' };
        }

        const corner = this.separate ? 'separate' : 'smooth';

        return { x: anchor.x, y: anchor.y, handleIn, handleOut, corner };
    }
}
