import type { Point } from '../../../../core/geometry/index.ts';
import type { LevelCursor } from '../../LevelCursor.ts';
import type { LevelPointerInput } from '../../Tool.ts';
import type { FrameHandle } from '../frame/FrameHandle.ts';
import type { SelectionFrame } from '../frame/SelectionFrame.ts';
import type { EntityResize } from '../resize/EntityResize.ts';
import { sizeReadout, readoutLengths } from '../../readout/readoutText.ts';
import { sizingModifiers } from '../../sizing/sizingModifiers.ts';
import { resizeFactor } from '../resize/resizeFactor.ts';

import type { SelectState, SelectStateHost } from './SelectState.ts';

// A drag on one of the eight handles: the handle follows the mouse on screen along the entity's own sides,
// and the release makes one step, `Resize <name>`. Shift keeps proportions, Alt or Ctrl+Shift resizes from
// the centre, Ctrl turns snapping off, Esc puts it back.
export class ResizeState implements SelectState {
    private readonly host: SelectStateHost;
    private readonly frame: SelectionFrame;
    private readonly resize: EntityResize;
    private readonly handle: FrameHandle;
    // From the mouse to the handle's middle at the press, so the handle never jumps under the mouse.
    private readonly grabOffset: Point;

    // The caller has begun the LiveEdit with the resize's targets.
    constructor(host: SelectStateHost, frame: SelectionFrame, resize: EntityResize, handle: FrameHandle, press: Point) {
        this.host = host;
        this.frame = frame;
        this.resize = resize;
        this.handle = handle;
        const handlePosition = frame.handlePosition(handle);
        this.grabOffset = { x: handlePosition.x - press.x, y: handlePosition.y - press.y };
    }

    // The handle's arrow, kept for the whole drag.
    get cursor(): LevelCursor {
        const directionDegrees = this.frame.handleDirectionDegrees(this.handle);

        return { kind: 'resize', directionDegrees };
    }

    pointerDown() {}

    pointerMove(input: LevelPointerInput) {
        this.resizeTo(input);
    }

    pointerUp(input: LevelPointerInput) {
        this.resizeTo(input);
        this.host.context.openLevel.liveEdit.commit(this.resize.label);
        this.host.goIdle();
    }

    cancel() {
        this.host.context.openLevel.liveEdit.cancel();
        this.host.goIdle();

        return true;
    }

    private resizeTo(input: LevelPointerInput) {
        const { snapper, view } = this.host.context;
        const modifiers = sizingModifiers(input.modifiers);
        const wanted = {
            x: input.levelPosition.x + this.grabOffset.x,
            y: input.levelPosition.y + this.grabOffset.y,
        };
        const snapped = snapper.snapPoint(wanted, view, { ctrlHeld: modifiers.ctrl }).point;
        const stretch = resizeFactor({
            handle: this.handle,
            box: this.frame.box,
            handleAt: this.frame.inverse.apply(snapped),
            fromCentre: modifiers.alt || this.frame.kind === 'world',
            proportional: modifiers.shift || this.resize.keepsRound,
        });

        const size = this.resize.apply(stretch);
        this.host.showReadout({ text: sizeReadout(size, readoutLengths(this.host.context)), at: input.levelPosition });
    }
}
