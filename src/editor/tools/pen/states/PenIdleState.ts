import { V1_LEVEL_LIMITS } from '../../../../core/level-data/index.ts';
import { samePoint } from '../../shape/polygonDrawing.ts';
import type { LevelPointerInput } from '../../Tool.ts';

import { PenPressState } from './PenPressState.ts';
import type { PenState, PenStateHost } from './PenState.ts';

const MAX_POINTS = V1_LEVEL_LIMITS.maxPathPoints;
export const TOO_MANY_POINTS = `A path holds at most ${MAX_POINTS.toLocaleString('en-US')} points`;
export const TOO_FEW_TO_CLOSE = 'A path closes from 3 points on';

// No button is down. A press starts a point, or closes the path on its first point from 3 points on (with
// fewer, it is ignored and the status says why). The second press of a double-click and a right-click
// finish the drawing open.
export class PenIdleState implements PenState {
    readonly isPressed = false;
    readonly placing = undefined;
    private readonly host: PenStateHost;

    constructor(host: PenStateHost) {
        this.host = host;
    }

    pointerDown(input: LevelPointerInput) {
        const host = this.host;
        const path = host.path;
        if (input.button === 'right') {
            host.finishOpen();
            return;
        }
        if (input.button !== 'left') return;

        if (path === undefined) {
            if (host.continueFrom(input.levelPosition)) return;

            this.startAt(input);
            return;
        }

        if (input.clickCount >= 2) {
            host.finishOpen();
            return;
        }

        if (host.endsOnFirst(input.levelPosition, input.modifiers)) {
            const first = path.points[0];
            if (path.points.length < 3 || first === undefined) {
                host.context.status.show(TOO_FEW_TO_CLOSE);
                return;
            }

            host.goTo(new PenPressState(host, { input, place: first, space: path.space, closing: first }));
            return;
        }

        if (path.points.length >= MAX_POINTS) {
            host.context.status.show(TOO_MANY_POINTS);
            return;
        }

        const place = host.nextPlace(input.levelPosition, input.modifiers, path.space);
        const last = path.points.at(-1);
        // A segment of no length draws nothing.
        if (last !== undefined && samePoint(last, place)) return;

        host.goTo(new PenPressState(host, { input, place, space: path.space, closing: undefined }));
    }

    pointerMove() {
        this.host.redraw();
    }

    pointerUp() {}

    keyDown() {
        return false;
    }

    keyUp() {}

    modifiersChanged() {
        this.host.redraw();
    }

    cancel() {}

    private startAt(input: LevelPointerInput) {
        const host = this.host;
        if (host.refusesNewPath()) return;

        const space = host.spaceForPress();
        if (space === undefined) return;

        const place = host.nextPlace(input.levelPosition, input.modifiers, space);
        host.goTo(new PenPressState(host, { input, place, space, closing: undefined }));
    }
}
