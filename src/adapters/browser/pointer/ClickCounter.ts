import type { Point } from '../../../core/geometry/index.ts';
import type { PointerButton } from '../../../editor/tools/index.ts';

// A press this soon after the last one, and this close to it, counts on from it: the usual system
// settings, since the browser tells pointer events nothing about double-clicks.
export const DOUBLE_CLICK_MS = 500;
export const DOUBLE_CLICK_DISTANCE_PX = 4;

type Press = {
    readonly button: PointerButton;
    readonly screenPosition: Point;
    readonly timeMs: number;
    readonly count: number;
};

// Counts the presses of a double-click: 1 for a press on its own, 2 for the second of a double-click.
export class ClickCounter {
    private last: Press | undefined;

    press(button: PointerButton, screenPosition: Point, timeMs: number) {
        const count = this.followsLast(button, screenPosition, timeMs) ? (this.last?.count ?? 0) + 1 : 1;
        this.last = { button, screenPosition, timeMs, count };

        return count;
    }

    private followsLast(button: PointerButton, screenPosition: Point, timeMs: number) {
        const last = this.last;
        if (last === undefined || last.button !== button) return false;

        const isSoon = timeMs - last.timeMs <= DOUBLE_CLICK_MS;
        const distance = Math.hypot(screenPosition.x - last.screenPosition.x, screenPosition.y - last.screenPosition.y);
        const isClose = distance <= DOUBLE_CLICK_DISTANCE_PX;

        return isSoon && isClose;
    }
}
