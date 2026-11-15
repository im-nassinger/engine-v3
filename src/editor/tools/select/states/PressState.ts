import type { LevelPointerInput } from '../../Tool.ts';
import type { PressTarget } from '../SelectionPicker.ts';

import { BoxSelectState } from './BoxSelectState.ts';
import type { SelectState, SelectStateHost } from './SelectState.ts';

// The requirement's "a drag under 3 px is a click", in screen pixels.
export const DRAG_START_PX = 3;

// A left press, until it moves 3 screen px (a drag) or is released (a click).
export class PressState implements SelectState {
    private readonly host: SelectStateHost;
    private readonly press: LevelPointerInput;
    private readonly target: PressTarget;

    constructor(host: SelectStateHost, press: LevelPointerInput, target: PressTarget) {
        this.host = host;
        this.press = press;
        this.target = target;
    }

    // Another button while the left one is held.
    pointerDown() {}

    pointerMove(input: LevelPointerInput) {
        if (!this.hasMovedFarEnough(input)) return;

        const startsABox = this.target.selectable === undefined || this.press.modifiers.shift;
        if (startsABox) {
            const box = new BoxSelectState(this.host, this.press.levelPosition, this.press.modifiers.shift);
            this.host.goTo(box);
            box.pointerMove(input);
            return;
        }

        // Step 8's MoveState moves the selection from here. Until then the entity pressed stays selected
        // and the rest of the drag does nothing.
        this.host.goIdle();
    }

    pointerUp() {
        this.click();
        this.host.goIdle();
    }

    cancel() {
        this.host.goIdle();

        return true;
    }

    // The press table's click column.
    private click() {
        const { selection } = this.host.context.openLevel;
        const selectable = this.target.selectable;

        if (this.press.modifiers.shift) {
            if (selectable !== undefined) {
                selection.toggle(selectable.id);
            }
            return;
        }

        if (selectable === undefined) {
            selection.clear();
            return;
        }

        selection.replace([selectable.id]);
    }

    private hasMovedFarEnough(input: LevelPointerInput) {
        const dx = input.screenPosition.x - this.press.screenPosition.x;
        const dy = input.screenPosition.y - this.press.screenPosition.y;

        return Math.hypot(dx, dy) >= DRAG_START_PX;
    }
}
