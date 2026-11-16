import { PointsMove } from '../../../commands/index.ts';
import { READ_ONLY_REASON } from '../../../history/index.ts';
import type { LevelPointerInput } from '../../Tool.ts';

import { PointBoxState } from './PointBoxState.ts';
import { PointDragState } from './PointDragState.ts';
import type { PointEditing } from './PointEditing.ts';
import { DRAG_START_PX } from './PressState.ts';
import type { SelectState, SelectStateHost } from './SelectState.ts';

// A left press while editing points, until it moves 3 screen px (a drag) or is released (a click).
// A drag from a point moves the selected points with it; a drag from anywhere else selects points with a box.
export class PointPressState implements SelectState {
    readonly editing: PointEditing;
    private readonly host: SelectStateHost;
    private readonly press: LevelPointerInput;
    private readonly pointIndex: number | undefined;
    private hasDragged = false;

    constructor(
        host: SelectStateHost,
        editing: PointEditing,
        press: LevelPointerInput,
        pointIndex: number | undefined,
    ) {
        this.host = host;
        this.editing = editing;
        this.press = press;
        this.pointIndex = pointIndex;
    }

    pointerDown() {}

    pointerMove(input: LevelPointerInput) {
        if (this.hasDragged || !this.hasMovedFarEnough(input)) return;

        this.hasDragged = true;
        if (this.pointIndex !== undefined) {
            this.dragPoints(this.pointIndex, input);
            return;
        }

        const box = new PointBoxState(this.host, this.editing, this.press.levelPosition, this.press.modifiers.shift);
        this.host.goTo(box);
        box.pointerMove(input);
    }

    pointerUp() {
        this.host.goTo(this.editing);
        if (this.hasDragged) return;

        this.click();
    }

    cancel() {
        this.host.goTo(this.editing);

        return true;
    }

    // A Shift+press on an unselected point wasn't selected on the press, so it joins the selected points now.
    private dragPoints(pointIndex: number, input: LevelPointerInput) {
        const { points } = this.editing;
        points.add([pointIndex]);

        const { openLevel, status } = this.host.context;
        const move = PointsMove.of(openLevel, points.entity, points.selectedIndexes);
        if (!(move instanceof PointsMove)) {
            status.show(move.reason);
            return;
        }

        const pressedStart = move.startLevelPosition(pointIndex);
        if (pressedStart === undefined) return;

        if (!openLevel.liveEdit.begin(move.targets)) {
            status.show(READ_ONLY_REASON);
            return;
        }

        const drag = new PointDragState(this.host, this.editing, move, pressedStart, this.press.levelPosition);
        this.host.goTo(drag);
        drag.pointerMove(input);
    }

    private click() {
        const { points } = this.editing;
        const isShift = this.press.modifiers.shift;

        if (this.pointIndex !== undefined) {
            if (isShift) {
                points.toggle(this.pointIndex);
            } else {
                points.selectOnly(this.pointIndex);
            }
            return;
        }

        if (isShift) return;

        const { zoom } = this.host.context.view;
        const isOnFrame = points.isOnFrame(this.press.levelPosition, zoom);
        if (isOnFrame) {
            points.clear();
            return;
        }

        // Empty space outside the shape's frame ends point editing, the click clearing the selection as
        // the Select tool's click there does.
        this.editing.end();
        this.host.context.openLevel.selection.clear();
    }

    private hasMovedFarEnough(input: LevelPointerInput) {
        const dx = input.screenPosition.x - this.press.screenPosition.x;
        const dy = input.screenPosition.y - this.press.screenPosition.y;

        return Math.hypot(dx, dy) >= DRAG_START_PX;
    }
}
