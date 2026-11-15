import type { Point } from '../../../core/geometry/index.ts';
import type { ViewState } from '../../view/index.ts';
import type { LevelPointerInput, PointerButton } from '../Tool.ts';

// Panning, before any tool: a middle drag at any time, or a left drag while Space is held. It changes
// only the ViewState, so it never makes a step.
export class PanGesture {
    private readonly view: ViewState;
    private spaceHeld = false;
    private panButton: PointerButton | undefined;
    private lastScreenPosition: Point = { x: 0, y: 0 };

    constructor(view: ViewState) {
        this.view = view;
    }

    get isSpaceHeld() {
        return this.spaceHeld;
    }

    get isPanning() {
        return this.panButton !== undefined;
    }

    spaceDown() {
        this.spaceHeld = true;
    }

    // A pan already started goes on until its button is released, and then the tool has the mouse again.
    spaceUp() {
        this.spaceHeld = false;
    }

    // True when the press starts a pan, so the tool never sees it.
    pointerDown(input: LevelPointerInput) {
        if (this.isPanning) return false;

        const isMiddle = input.button === 'middle';
        const isLeftWithSpace = input.button === 'left' && this.spaceHeld;
        if (!isMiddle && !isLeftWithSpace) return false;

        this.panButton = input.button;
        this.lastScreenPosition = input.screenPosition;

        return true;
    }

    // True while panning: the view moved with the mouse.
    pointerMove(input: LevelPointerInput) {
        if (!this.isPanning) return false;

        const deltaX = input.screenPosition.x - this.lastScreenPosition.x;
        const deltaY = input.screenPosition.y - this.lastScreenPosition.y;
        this.lastScreenPosition = input.screenPosition;
        this.view.panBy(deltaX, deltaY);

        return true;
    }

    // True when the release ends the pan.
    pointerUp(input: LevelPointerInput) {
        if (input.button !== this.panButton) return false;

        this.panButton = undefined;

        return true;
    }

    // The window lost focus: no key up or button release will arrive.
    release() {
        this.spaceHeld = false;
        this.panButton = undefined;
    }
}
