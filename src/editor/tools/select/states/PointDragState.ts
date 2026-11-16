import type { Point } from '../../../../core/geometry/index.ts';
import type { PointsMove } from '../../../commands/index.ts';
import type { LevelPointerInput } from '../../Tool.ts';
import { moveReadout } from '../../readout/readoutText.ts';

import type { PointEditing } from './PointEditing.ts';
import type { SelectState, SelectStateHost } from './SelectState.ts';

// A drag that started on a point while editing points: the selected points follow the mouse, live, and
// the release makes one step, `Move points of Polygon 1`. The pressed point snaps as a point and the
// others keep their distance from it; Ctrl turns snapping off, Esc puts them back.
export class PointDragState implements SelectState {
    readonly editing: PointEditing;
    private readonly host: SelectStateHost;
    private readonly move: PointsMove;
    private readonly pressPosition: Point;
    private readonly pressedStart: Point;

    // The caller has begun the LiveEdit with the move's targets.
    constructor(
        host: SelectStateHost,
        editing: PointEditing,
        move: PointsMove,
        pressedStart: Point,
        pressPosition: Point,
    ) {
        this.host = host;
        this.editing = editing;
        this.move = move;
        this.pressedStart = pressedStart;
        this.pressPosition = pressPosition;
    }

    pointerDown() {}

    pointerMove(input: LevelPointerInput) {
        this.moveTo(input);
    }

    pointerUp(input: LevelPointerInput) {
        this.moveTo(input);
        this.host.context.openLevel.liveEdit.commit(this.move.label);
        this.backToEditing();
    }

    cancel() {
        this.host.context.openLevel.liveEdit.cancel();
        this.backToEditing();

        return true;
    }

    private moveTo(input: LevelPointerInput) {
        const offset = this.offsetTo(input);
        this.move.moveBy(offset);
        this.host.showReadout({ text: moveReadout(offset), at: input.levelPosition });
    }

    private offsetTo(input: LevelPointerInput) {
        const pressedNow = {
            x: this.pressedStart.x + input.levelPosition.x - this.pressPosition.x,
            y: this.pressedStart.y + input.levelPosition.y - this.pressPosition.y,
        };
        const { snapper, view } = this.host.context;
        const options = { ctrlHeld: input.modifiers.ctrl };
        const snapped = snapper.snapPoint(pressedNow, view, options).point;

        return { x: snapped.x - this.pressedStart.x, y: snapped.y - this.pressedStart.y };
    }

    private backToEditing() {
        this.host.showReadout(undefined);
        this.host.goTo(this.editing);
    }
}
