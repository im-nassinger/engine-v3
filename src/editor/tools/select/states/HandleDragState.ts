import type { Point } from '../../../../core/geometry/index.ts';
import type { HandleMove } from '../../../commands/index.ts';
import type { LevelPointerInput } from '../../Tool.ts';
import { POINT_HIT_PX } from '../points/PointHits.ts';

import type { PointEditing } from './PointEditing.ts';
import type { SelectState, SelectStateHost } from './SelectState.ts';

// A drag on a selected path point's handle: the handle follows the mouse, live, and the release makes one
// step, `Move a handle of Path 1`. A smooth point turns its other handle to stay opposite; Alt during the
// drag makes it separate for the rest of the drag, so the handle moves alone, and while Alt is held an end
// brought within a point's reach of its point removes the handle (the point turns sharp when none is
// left); moving away again brings it back, until the release. Shift keeps the handle to 15°;
// otherwise its end snaps as a point, and Ctrl turns that off. Esc puts it back.
export class HandleDragState implements SelectState {
    readonly editing: PointEditing;
    private readonly host: SelectStateHost;
    private readonly move: HandleMove;
    private readonly pressPosition: Point;
    // From the press to the handle's end, so the handle doesn't jump to the mouse.
    private readonly grabOffset: Point;
    private separate = false;
    private hasMoved = false;

    // The caller has begun the LiveEdit with the move's targets.
    constructor(host: SelectStateHost, editing: PointEditing, move: HandleMove, pressPosition: Point) {
        this.host = host;
        this.editing = editing;
        this.move = move;
        this.pressPosition = pressPosition;
        const end = move.startLevelEnd;
        this.grabOffset = { x: end.x - pressPosition.x, y: end.y - pressPosition.y };
    }

    pointerDown() {}

    pointerMove(input: LevelPointerInput) {
        this.moveTo(input);
    }

    // A press let go where it was writes nothing, so it makes no step.
    pointerUp(input: LevelPointerInput) {
        this.moveTo(input);
        const { liveEdit } = this.host.context.openLevel;
        if (this.hasMoved) {
            liveEdit.commit(this.move.label);
        } else {
            liveEdit.cancel();
        }
        this.host.goTo(this.editing);
    }

    cancel() {
        this.host.context.openLevel.liveEdit.cancel();
        this.host.goTo(this.editing);

        return true;
    }

    private moveTo(input: LevelPointerInput) {
        const { levelPosition, modifiers } = input;
        const isAtPress = levelPosition.x === this.pressPosition.x && levelPosition.y === this.pressPosition.y;
        if (isAtPress && !this.hasMoved) return;

        this.hasMoved = true;
        if (modifiers.alt) {
            this.separate = true;
        }

        const end = { x: levelPosition.x + this.grabOffset.x, y: levelPosition.y + this.grabOffset.y };
        const placed = modifiers.shift ? end : this.snapped(end, modifiers.ctrl);
        const remove = modifiers.alt && this.isOnPoint(end);
        this.move.moveTo(placed, { lockAngle: modifiers.shift, separate: this.separate, remove });
        this.host.redraw();
    }

    // Whether the handle's end, as the mouse puts it before any snapping, is within a point's reach of the
    // handle's point.
    private isOnPoint(end: Point) {
        const point = this.move.levelPoint;
        const reach = POINT_HIT_PX / this.host.context.view.zoom;

        return Math.hypot(end.x - point.x, end.y - point.y) <= reach;
    }

    private snapped(end: Point, ctrlHeld: boolean) {
        const { snapper, view } = this.host.context;

        return snapper.snapPoint(end, view, { ctrlHeld }).point;
    }
}
