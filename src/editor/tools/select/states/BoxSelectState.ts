import type { Point } from '../../../../core/geometry/index.ts';
import type { LevelPointerInput } from '../../Tool.ts';
import { boxBetween } from '../SelectionPicker.ts';

import type { SelectState, SelectStateHost } from './SelectState.ts';

// A drag that started on empty space, or anywhere with Shift: the box selects everything it touches on
// release. Shift at the press adds to the selection; Ctrl at the release selects inside groups.
export class BoxSelectState implements SelectState {
    private readonly host: SelectStateHost;
    private readonly corner: Point;
    private readonly adding: boolean;

    constructor(host: SelectStateHost, corner: Point, adding: boolean) {
        this.host = host;
        this.corner = corner;
        this.adding = adding;
    }

    pointerDown() {}

    pointerMove(input: LevelPointerInput) {
        this.host.showBox(boxBetween(this.corner, input.levelPosition));
    }

    pointerUp(input: LevelPointerInput) {
        const box = boxBetween(this.corner, input.levelPosition);
        const touched = this.host.picker.selectablesInBox(box, input.modifiers.ctrl);
        const ids = touched.map((entity) => entity.id);
        const { selection } = this.host.context.openLevel;

        if (this.adding) {
            selection.add(ids);
        } else {
            selection.replace(ids);
        }

        this.end();
    }

    cancel() {
        this.end();

        return true;
    }

    private end() {
        this.host.showBox(undefined);
        this.host.goIdle();
    }
}
