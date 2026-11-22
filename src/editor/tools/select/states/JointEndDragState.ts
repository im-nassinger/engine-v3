import type { Point } from '../../../../core/geometry/index.ts';
import type { JointEndMove } from '../../../commands/index.ts';
import type { LevelPointerInput } from '../../Tool.ts';

import type { SelectState, SelectStateHost } from './SelectState.ts';

// A drag on one end's icon of a Rope or Spring: that end follows the mouse, live, and the release makes one
// step, `Move an end of Rope 1`. The end snaps as a point; Ctrl turns that off. Esc puts it back.
export class JointEndDragState implements SelectState {
    private readonly host: SelectStateHost;
    private readonly move: JointEndMove;
    private readonly pressPosition: Point;
    // From the press to the end, so the end doesn't jump to the mouse.
    private readonly grabOffset: Point;
    private hasMoved = false;

    // The caller has begun the LiveEdit with the move's targets.
    constructor(host: SelectStateHost, move: JointEndMove, pressPosition: Point) {
        this.host = host;
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
        this.host.goIdle();
    }

    cancel() {
        this.host.context.openLevel.liveEdit.cancel();
        this.host.goIdle();

        return true;
    }

    private moveTo(input: LevelPointerInput) {
        const { levelPosition, modifiers } = input;
        const isAtPress = levelPosition.x === this.pressPosition.x && levelPosition.y === this.pressPosition.y;
        if (isAtPress && !this.hasMoved) return;

        this.hasMoved = true;
        const end = { x: levelPosition.x + this.grabOffset.x, y: levelPosition.y + this.grabOffset.y };
        const { snapper, view } = this.host.context;
        this.move.moveTo(snapper.snapPoint(end, view, { ctrlHeld: modifiers.ctrl }).point);
        this.host.redraw();
    }
}
