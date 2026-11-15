import type { Bounds } from '../../../core/geometry/index.ts';
import { VersionCounter } from '../../../core/events/index.ts';
import type { LevelPointerInput, Tool, ToolContext } from '../Tool.ts';

import { SelectionFrame } from './frame/SelectionFrame.ts';
import { SelectionPicker } from './SelectionPicker.ts';
import { IdleState } from './states/IdleState.ts';
import type { SelectState, SelectStateHost } from './states/SelectState.ts';

const SELECT_HINT =
    'Click to select. Drag to move. Drag a handle to resize. Drag on empty space to select with a box. Double-click goes into a group.';

// Picks entities by click, Shift+click and the selection box, moves them by dragging, resizes one entity by
// its handles, and goes into and out of groups by double-click. It holds one drag state at a time; rotating
// comes next.
export class SelectTool implements Tool {
    readonly id = 'select';
    readonly hint = SELECT_HINT;
    readonly preview = new VersionCounter();
    private state: SelectState | undefined;
    private box: Bounds | undefined;
    private context: ToolContext | undefined;

    // The selection box being dragged, in level positions, for the overlay.
    get selectionBox() {
        return this.box;
    }

    // The handles' frame of the one selected entity, for the overlay. Handles hide during a drag.
    get frame() {
        const isIdle = this.state instanceof IdleState;
        if (!isIdle || this.context === undefined) return undefined;

        return SelectionFrame.of(this.context.openLevel);
    }

    activate(context: ToolContext) {
        this.context = context;
        const host: SelectStateHost = {
            context,
            picker: new SelectionPicker(context),
            goTo: (state) => {
                this.state = state;
            },
            goIdle: () => {
                this.state = new IdleState(host);
            },
            showBox: (box) => this.showBox(box),
        };

        this.state = new IdleState(host);
    }

    // A drag in progress ends as if Esc were pressed.
    deactivate() {
        this.state?.cancel();
    }

    pointerDown(input: LevelPointerInput) {
        this.state?.pointerDown(input);
    }

    pointerMove(input: LevelPointerInput) {
        this.state?.pointerMove(input);
    }

    pointerUp(input: LevelPointerInput) {
        this.state?.pointerUp(input);
    }

    keyDown() {
        return false;
    }

    keyUp() {}

    cancel() {
        return this.state?.cancel() ?? false;
    }

    private showBox(box: Bounds | undefined) {
        if (box === undefined && this.box === undefined) return;

        this.box = box;
        this.preview.increment();
    }
}
