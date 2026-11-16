import type { Point } from '../../../../core/geometry/index.ts';
import type { LevelPointerInput } from '../../Tool.ts';
import { boxBetween } from '../SelectionPicker.ts';

import type { PointEditing } from './PointEditing.ts';
import type { SelectState, SelectStateHost } from './SelectState.ts';

// A drag while editing points that didn't start on a point: on release the box selects the points
// inside it. Shift at the press adds them to the selected points.
export class PointBoxState implements SelectState {
    readonly editing: PointEditing;
    private readonly host: SelectStateHost;
    private readonly corner: Point;
    private readonly adding: boolean;

    constructor(host: SelectStateHost, editing: PointEditing, corner: Point, adding: boolean) {
        this.host = host;
        this.editing = editing;
        this.corner = corner;
        this.adding = adding;
    }

    pointerDown() {}

    pointerMove(input: LevelPointerInput) {
        this.host.showBox(boxBetween(this.corner, input.levelPosition));
    }

    pointerUp(input: LevelPointerInput) {
        const box = boxBetween(this.corner, input.levelPosition);
        const { points } = this.editing;
        const inside = points.pointsInBox(box);

        if (this.adding) {
            points.add(inside);
        } else {
            points.replace(inside);
        }

        this.back();
    }

    cancel() {
        this.back();

        return true;
    }

    private back() {
        this.host.showBox(undefined);
        this.host.goTo(this.editing);
    }
}
