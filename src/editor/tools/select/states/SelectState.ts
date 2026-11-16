import type { Bounds } from '../../../../core/geometry/index.ts';
import type { LevelPointerInput, ToolContext } from '../../Tool.ts';
import type { DragReadout } from '../../readout/DragReadout.ts';
import type { SelectionPicker } from '../SelectionPicker.ts';

// What a drag state is given by the Select tool.
export type SelectStateHost = {
    readonly context: ToolContext;
    readonly picker: SelectionPicker;
    goTo(state: SelectState): void;
    // Also hides the readout. Returns the new IdleState, for a press it should answer.
    goIdle(): SelectState;
    showBox(box: Bounds | undefined): void;
    showReadout(readout: DragReadout | undefined): void;
    // The overlay draws again: the selected points changed.
    redraw(): void;
};

// One of the Select tool's drag states (the State pattern). Only one is active at a time.
export type SelectState = {
    pointerDown(input: LevelPointerInput): void;
    pointerMove(input: LevelPointerInput): void;
    pointerUp(input: LevelPointerInput): void;
    // Esc. True when there was a drag to cancel.
    cancel(): boolean;
};
