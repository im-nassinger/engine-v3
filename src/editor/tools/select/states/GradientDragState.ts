import { StyleComponent } from '../../../../core/components/index.ts';
import type { Point } from '../../../../core/geometry/index.ts';
import { labelName } from '../../../../core/level/index.ts';
import { moveGradientHandle } from '../../../commands/index.ts';
import type { GradientHandleRole } from '../../../commands/index.ts';
import type { ValueTarget } from '../../../history/index.ts';
import type { LevelPointerInput } from '../../Tool.ts';
import type { GradientHandles } from '../gradient/GradientHandles.ts';

import type { SelectState, SelectStateHost } from './SelectState.ts';

// A drag on a gradient handle: the fill follows the mouse, live, and the release makes one step,
// `Change the fill of Rectangle 1`. Shift keeps a linear gradient's direction to 15° on screen around the
// end not dragged; Esc puts it back.
export class GradientDragState implements SelectState {
    private readonly host: SelectStateHost;
    private readonly gradient: GradientHandles;
    private readonly role: GradientHandleRole;
    private readonly target: ValueTarget;
    private readonly label: string;
    // From the press to the handle's middle, so the handle doesn't jump to the mouse.
    private readonly grabOffset: Point;

    // The caller has begun the LiveEdit with fillTarget.
    constructor(host: SelectStateHost, gradient: GradientHandles, role: GradientHandleRole, press: Point) {
        this.host = host;
        this.gradient = gradient;
        this.role = role;
        const middle = gradient.handles.find((handle) => handle.role === role)?.position ?? press;
        this.grabOffset = { x: middle.x - press.x, y: middle.y - press.y };
        this.target = GradientDragState.fillTarget(gradient);
        this.label = `Change the fill of ${labelName(gradient.entity)}`;
    }

    static fillTarget(gradient: GradientHandles): ValueTarget {
        return { entityId: gradient.entity.id, schema: StyleComponent.schema, key: 'fill' };
    }

    pointerDown() {}

    pointerMove(input: LevelPointerInput) {
        this.moveTo(input);
    }

    pointerUp(input: LevelPointerInput) {
        this.moveTo(input);
        this.host.context.openLevel.liveEdit.commit(this.label);
        this.host.goIdle();
    }

    cancel() {
        this.host.context.openLevel.liveEdit.cancel();
        this.host.goIdle();

        return true;
    }

    // From the fill at the press, so the handle not dragged stays exactly where it was.
    private moveTo(input: LevelPointerInput) {
        const { fill, placement } = this.gradient;
        const handlePosition = {
            x: input.levelPosition.x + this.grabOffset.x,
            y: input.levelPosition.y + this.grabOffset.y,
        };
        const moved = moveGradientHandle(fill, this.role, handlePosition, placement, input.modifiers.shift);

        this.host.context.openLevel.liveEdit.update(this.target, moved);
        this.host.redraw();
    }
}
