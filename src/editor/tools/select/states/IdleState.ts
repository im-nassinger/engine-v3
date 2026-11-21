import { EntityRotate } from '../../../commands/index.ts';
import { READ_ONLY_REASON } from '../../../history/index.ts';
import type { LevelPointerInput } from '../../Tool.ts';

import { SelectionFrame } from '../frame/SelectionFrame.ts';
import { GradientDragState } from './GradientDragState.ts';
import { GradientHandles } from '../gradient/GradientHandles.ts';
import { EntityResize } from '../resize/EntityResize.ts';

import { doubleClick } from './doubleClick.ts';
import { PressState } from './PressState.ts';
import { ResizeState } from './ResizeState.ts';
import { RotateState } from './RotateState.ts';
import type { SelectState, SelectStateHost } from './SelectState.ts';

// Nothing held. A left press on a gradient handle starts a GradientDragState, on a frame handle a ResizeState, just outside a corner a RotateState,
// elsewhere a PressState; a double-click is answered at once.
export class IdleState implements SelectState {
    private readonly host: SelectStateHost;

    constructor(host: SelectStateHost) {
        this.host = host;
    }

    pointerDown(input: LevelPointerInput) {
        if (input.button !== 'left') return;

        if (input.clickCount >= 2) {
            doubleClick(this.host, input.levelPosition);
            return;
        }

        if (this.startsGradientDrag(input) || this.startsResize(input) || this.startsRotate(input)) return;

        const target = this.host.picker.targetAt(input.levelPosition);
        const { selection } = this.host.context.openLevel;
        const selectable = target.selectable;

        // An unselected entity is selected on the press, so a drag moves it; a selected one narrows on release.
        const selectsNow = !input.modifiers.shift && selectable !== undefined && !selection.has(selectable.id);
        if (selectsNow) {
            selection.replace([selectable.id]);
        }

        this.host.goTo(new PressState(this.host, input, target));
    }

    pointerMove() {}

    // The release of a double-click's second press, or of a drag cancelled by Esc.
    pointerUp() {}

    cancel() {
        return false;
    }

    // A gradient handle is in front of the frame's handles and the entities.
    private startsGradientDrag(input: LevelPointerInput) {
        const { openLevel, view } = this.host.context;
        const gradient = GradientHandles.of(openLevel);
        const role = gradient?.handleAt(input.levelPosition, view.zoom);
        if (gradient === undefined || role === undefined || openLevel.liveEdit.isActive) return false;

        if (!openLevel.liveEdit.begin([GradientDragState.fillTarget(gradient)])) return this.refusedAsReadOnly();

        this.host.goTo(new GradientDragState(this.host, gradient, role, input.levelPosition));

        return true;
    }

    // A handle is in front of everything, so a press on one resizes at once.
    private startsResize(input: LevelPointerInput) {
        const { openLevel, view } = this.host.context;
        const frame = SelectionFrame.of(openLevel);
        const handle = frame?.handleAt(input.levelPosition, view.zoom);
        if (frame === undefined || handle === undefined) return false;

        const resize = EntityResize.of(openLevel, frame);
        if (resize === undefined || openLevel.liveEdit.isActive) return false;

        if (!openLevel.liveEdit.begin(resize.targets)) return this.refusedAsReadOnly();

        this.host.goTo(new ResizeState(this.host, frame, resize, handle, input.levelPosition));

        return true;
    }

    // The rotate area lies just outside a corner and, like a handle, comes before what lies under it.
    private startsRotate(input: LevelPointerInput) {
        const { openLevel, view } = this.host.context;
        const frame = SelectionFrame.of(openLevel);
        const isOnRotateArea = frame?.isOnRotateArea(input.levelPosition, view.zoom) ?? false;
        if (frame === undefined || !isOnRotateArea) return false;

        const rotate = EntityRotate.of(openLevel, frame.entity, frame.box.centre);
        if (rotate === undefined || openLevel.liveEdit.isActive) return false;

        if (!openLevel.liveEdit.begin(rotate.targets)) return this.refusedAsReadOnly();

        this.host.goTo(new RotateState(this.host, frame, rotate, input.levelPosition));

        return true;
    }

    // The press is used up: a handle in a read-only level starts nothing.
    private refusedAsReadOnly() {
        this.host.context.status.show(READ_ONLY_REASON);

        return true;
    }
}
