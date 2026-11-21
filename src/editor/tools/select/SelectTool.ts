import type { Bounds, Point } from '../../../core/geometry/index.ts';
import { VersionCounter } from '../../../core/events/index.ts';
import { EntityRotate } from '../../commands/index.ts';
import { DEFAULT_CURSOR, ROTATE_CURSOR } from '../LevelCursor.ts';
import type { LevelCursor } from '../LevelCursor.ts';
import type { LevelPointerInput, Tool, ToolContext, ToolKey } from '../Tool.ts';

import { SelectionFrame } from './frame/SelectionFrame.ts';
import { GradientDragState } from './states/GradientDragState.ts';
import { GradientHandles } from './gradient/GradientHandles.ts';
import type { DragReadout } from '../readout/DragReadout.ts';
import { SelectionPicker } from './SelectionPicker.ts';
import { HandleDragState } from './states/HandleDragState.ts';
import { IdleState } from './states/IdleState.ts';
import { PointBoxState } from './states/PointBoxState.ts';
import type { PointEditing } from './states/PointEditing.ts';
import { PointEditState } from './states/PointEditState.ts';
import { PointPressState } from './states/PointPressState.ts';
import { EntityResize } from './resize/EntityResize.ts';
import { ResizeState } from './states/ResizeState.ts';
import { RotateState } from './states/RotateState.ts';
import type { SelectState, SelectStateHost } from './states/SelectState.ts';

// Picks entities by click, Shift+click and the selection box, moves them by dragging, resizes one entity by
// its handles, rotates it just outside a corner and drags its gradient's handles, goes into and out of
// groups by double-click, and edits a polygon's, line's or path's points after a double-click on it. It holds one
// state at a time.
export class SelectTool implements Tool {
    readonly id = 'select';
    readonly preview = new VersionCounter();
    private state: SelectState | undefined;
    private box: Bounds | undefined;
    private shownReadout: DragReadout | undefined;
    private context: ToolContext | undefined;
    // Where the mouse was last, in level positions, for the cursor.
    private lastPointer: Point | undefined;

    // The selection box being dragged, in level positions, for the overlay.
    get selectionBox() {
        return this.box;
    }

    // The distance, size or angle of the drag in progress, for the overlay.
    get readout() {
        return this.shownReadout;
    }

    // The handles' frame of the one selected entity, for the overlay. Handles hide during a drag.
    get frame() {
        const isIdle = this.state instanceof IdleState;
        if (!isIdle || this.context === undefined) return undefined;

        return SelectionFrame.of(this.context.openLevel);
    }

    // The one selected entity's gradient handles, for the overlay: shown while nothing is dragged and
    // during their own drag, hidden during other drags and point editing, as the frame's handles are.
    get gradientHandles() {
        const shows = this.state instanceof IdleState || this.state instanceof GradientDragState;
        if (!shows || this.context === undefined) return undefined;

        return GradientHandles.of(this.context.openLevel);
    }

    // The arrows over a frame handle and the turning arrow just outside a corner, where a press would
    // resize or rotate, kept for the whole drag.
    get cursor(): LevelCursor {
        if (this.state instanceof RotateState) return ROTATE_CURSOR;
        if (this.state instanceof ResizeState) return this.state.cursor;
        if (!(this.state instanceof IdleState)) return DEFAULT_CURSOR;

        return this.hoverCursor();
    }

    // The polygon, line or path whose points are being edited, with its selected points, for the overlay.
    get editedPoints() {
        const editing = pointEditingOf(this.state);
        if (editing === undefined || !editing.isEditing) return undefined;

        return editing.points;
    }

    activate(context: ToolContext) {
        this.context = context;
        const host: SelectStateHost = {
            context,
            picker: new SelectionPicker(context),
            // Each state change redraws, since the handles follow the state.
            goTo: (state) => {
                this.state = state;
                this.preview.increment();
            },
            goIdle: () => {
                const idle = new IdleState(host);
                this.state = idle;
                this.showReadout(undefined);
                this.preview.increment();

                return idle;
            },
            showBox: (box) => this.showBox(box),
            showReadout: (readout) => this.showReadout(readout),
            redraw: () => this.preview.increment(),
        };

        this.state = new IdleState(host);
    }

    // A drag in progress ends as if Esc were pressed, and so does point editing.
    deactivate() {
        let hadSomethingToCancel = this.state?.cancel() ?? false;
        while (hadSomethingToCancel) {
            hadSomethingToCancel = this.state?.cancel() ?? false;
        }
    }

    pointerDown(input: LevelPointerInput) {
        this.lastPointer = input.levelPosition;
        this.state?.pointerDown(input);
    }

    pointerMove(input: LevelPointerInput) {
        this.lastPointer = input.levelPosition;
        this.state?.pointerMove(input);
    }

    pointerUp(input: LevelPointerInput) {
        this.lastPointer = input.levelPosition;
        this.state?.pointerUp(input);
    }

    // Only point editing uses keys: the arrows and Delete. The tool's other keys are the commands'.
    keyDown(key: ToolKey) {
        if (!(this.state instanceof PointEditState)) return false;

        return this.state.keyDown(key);
    }

    keyUp() {}

    // The Select tool draws nothing, so Ctrl+Z goes on to Undo.
    undoDrawingStep() {
        return false;
    }

    cancel() {
        return this.state?.cancel() ?? false;
    }

    // What a press at the mouse would start, in IdleState's order: a gradient handle first, then a frame
    // handle, then the rotate area.
    private hoverCursor(): LevelCursor {
        const context = this.context;
        const point = this.lastPointer;
        if (context === undefined || point === undefined) return DEFAULT_CURSOR;

        const { openLevel, view } = context;
        const gradient = GradientHandles.of(openLevel);
        const isOnGradientHandle = gradient?.handleAt(point, view.zoom) !== undefined;
        if (isOnGradientHandle) return DEFAULT_CURSOR;

        const frame = SelectionFrame.of(openLevel);
        if (frame === undefined) return DEFAULT_CURSOR;

        const handle = frame.handleAt(point, view.zoom);
        if (handle !== undefined) {
            const canResize = EntityResize.of(openLevel, frame) !== undefined;
            if (!canResize) return DEFAULT_CURSOR;

            const directionDegrees = frame.handleDirectionDegrees(handle);
            return { kind: 'resize', directionDegrees };
        }

        if (!frame.isOnRotateArea(point, view.zoom)) return DEFAULT_CURSOR;

        const canRotate = EntityRotate.of(openLevel, frame.entity, frame.box.centre) !== undefined;
        if (!canRotate) return DEFAULT_CURSOR;

        return ROTATE_CURSOR;
    }

    private showBox(box: Bounds | undefined) {
        if (box === undefined && this.box === undefined) return;

        this.box = box;
        this.preview.increment();
    }

    private showReadout(readout: DragReadout | undefined) {
        if (readout === undefined && this.shownReadout === undefined) return;

        this.shownReadout = readout;
        this.preview.increment();
    }
}

// Point editing goes on during a press or a box drag on its points, and a drag of a handle.
function pointEditingOf(state: SelectState | undefined): PointEditing | undefined {
    if (state instanceof PointEditState) return state;
    const isPointEditingDrag =
        state instanceof PointPressState || state instanceof PointBoxState || state instanceof HandleDragState;
    if (isPointEditingDrag) return state.editing;

    return undefined;
}
