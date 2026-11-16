import type { Point } from '../../../../core/geometry/index.ts';
import type { SelectionMove } from '../../../commands/index.ts';
import type { LevelPointerInput } from '../../Tool.ts';
import { moveReadout } from '../readout/readoutText.ts';

import type { SelectState, SelectStateHost } from './SelectState.ts';

// A drag that started on an entity: the whole selection follows the mouse, live, and the release makes one
// step, `Move N entities`. Shift locks to the axis moved along most, Ctrl turns snapping off, Esc puts it back.
export class MoveState implements SelectState {
    private readonly host: SelectStateHost;
    private readonly move: SelectionMove;
    private readonly pressPosition: Point;

    // The caller has begun the LiveEdit with the move's targets.
    constructor(host: SelectStateHost, move: SelectionMove, pressPosition: Point) {
        this.host = host;
        this.move = move;
        this.pressPosition = pressPosition;
    }

    pointerDown() {}

    pointerMove(input: LevelPointerInput) {
        this.moveTo(input);
    }

    pointerUp(input: LevelPointerInput) {
        this.moveTo(input);
        this.host.context.openLevel.liveEdit.commit(this.move.label);
        this.host.goIdle();
    }

    cancel() {
        this.host.context.openLevel.liveEdit.cancel();
        this.host.goIdle();

        return true;
    }

    private moveTo(input: LevelPointerInput) {
        const offset = this.offsetTo(input);
        this.move.moveBy(offset);
        this.host.showReadout({ text: moveReadout(offset), at: input.levelPosition });
    }

    private offsetTo(input: LevelPointerInput) {
        const dragged = {
            x: input.levelPosition.x - this.pressPosition.x,
            y: input.levelPosition.y - this.pressPosition.y,
        };
        const { snapper, view } = this.host.context;
        const options = { ctrlHeld: input.modifiers.ctrl };

        if (!input.modifiers.shift) return snapper.snapMove(this.move.startBounds, dragged, view, options).point;

        // Snapping only along the axis kept, so the other stays exactly where it started.
        const keepsX = Math.abs(dragged.x) >= Math.abs(dragged.y);
        const locked = keepsX ? { x: dragged.x, y: 0 } : { x: 0, y: dragged.y };
        const snapped = snapper.snapMove(this.move.startBounds, locked, view, options).point;

        return keepsX ? { x: snapped.x, y: 0 } : { x: 0, y: snapped.y };
    }
}
