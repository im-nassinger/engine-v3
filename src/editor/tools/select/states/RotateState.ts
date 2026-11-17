import type { Point } from '../../../../core/geometry/index.ts';
import type { EntityRotate } from '../../../commands/index.ts';
import type { LevelPointerInput } from '../../Tool.ts';
import type { SelectionFrame } from '../frame/SelectionFrame.ts';
import { angleReadout } from '../../readout/readoutText.ts';

import type { SelectState, SelectStateHost } from './SelectState.ts';

const DEGREES_PER_RADIAN = 180 / Math.PI;
// Shift snaps the Rotation to multiples of this.
const SNAP_DEGREES = 15;

// A drag just outside a corner: the entity turns around its frame's centre as far as the mouse turns
// around it on screen, and the release makes one step, `Rotate <name>`. Shift snaps to 15°, Esc puts it back.
export class RotateState implements SelectState {
    private readonly host: SelectStateHost;
    private readonly rotate: EntityRotate;
    private readonly pivot: Point;
    // Degrees turned on screen so far, counted past a half turn, so the mouse can go round more than once.
    private turned = 0;
    private lastAngle: number;

    // The caller has begun the LiveEdit with the rotate's targets.
    constructor(host: SelectStateHost, frame: SelectionFrame, rotate: EntityRotate, press: Point) {
        this.host = host;
        this.rotate = rotate;
        this.pivot = frame.matrix.apply(frame.box.centre);
        this.lastAngle = this.angleOf(press) ?? 0;
    }

    pointerDown() {}

    pointerMove(input: LevelPointerInput) {
        this.rotateTo(input);
    }

    pointerUp(input: LevelPointerInput) {
        this.rotateTo(input);
        this.host.context.openLevel.liveEdit.commit(this.rotate.label);
        this.host.goIdle();
    }

    cancel() {
        this.host.context.openLevel.liveEdit.cancel();
        this.host.goIdle();

        return true;
    }

    private rotateTo(input: LevelPointerInput) {
        const angle = this.angleOf(input.levelPosition);
        if (angle !== undefined) {
            this.turned += halfTurnAround(angle - this.lastAngle);
            this.lastAngle = angle;
        }

        const free = this.rotate.startRotation + this.turned * this.rotate.screenDirection;
        const rotation = input.modifiers.shift ? Math.round(free / SNAP_DEGREES) * SNAP_DEGREES + 0 : free;

        this.rotate.apply(rotation);
        this.host.showReadout({ text: angleReadout(rotation), at: input.levelPosition });
    }

    // Clockwise on screen from the level's x axis, or undefined on the pivot itself, where no angle shows.
    private angleOf(point: Point) {
        const dx = point.x - this.pivot.x;
        const dy = point.y - this.pivot.y;
        if (dx === 0 && dy === 0) return undefined;

        return Math.atan2(dy, dx) * DEGREES_PER_RADIAN;
    }
}

// The same turn, between −180° and 180°.
function halfTurnAround(degrees: number) {
    if (degrees > 180) return degrees - 360;
    if (degrees <= -180) return degrees + 360;

    return degrees;
}
