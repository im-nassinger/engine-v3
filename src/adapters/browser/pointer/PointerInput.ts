import type { Unsubscribe } from '../../../core/events/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import type { KeyboardPlatform } from '../../../editor/shortcuts/index.ts';
import type {
    EscapeChain,
    LevelPointerInput,
    MousePosition,
    PointerButton,
    ToolController,
} from '../../../editor/tools/index.ts';
import { ZOOM_STEP } from '../../../editor/view/index.ts';
import type { ViewState } from '../../../editor/view/index.ts';

import { ClickCounter } from './ClickCounter.ts';
import { NOTCH_PX, wheelPixels } from './wheelPixels.ts';

export type PointerInputParts = {
    readonly tools: Pick<ToolController, 'pointerDown' | 'pointerMove' | 'pointerUp'>;
    readonly escape: Pick<EscapeChain, 'dragLost' | 'focusLost'>;
    // The debug box's mouse position.
    readonly mouse: Pick<MousePosition, 'moveTo' | 'leave'>;
    readonly view: ViewState;
    readonly platform: KeyboardPlatform;
    // Test play: while a run is going, presses, moves and the wheel do nothing, so the editor's view and
    // tools are as they were at Stop. A release still goes through, ending a drag begun before Play.
    readonly play?: { readonly isRunGoing: boolean };
};

// PointerEvent.button's numbers, and the bit each sets in PointerEvent.buttons.
const BUTTONS: readonly (readonly [number, number, PointerButton])[] = [
    [0, 1, 'left'],
    [1, 4, 'middle'],
    [2, 2, 'right'],
];
const MIDDLE_BUTTON = 1;
// A pointermove that isn't a button going down or up.
const NO_BUTTON_CHANGE = -1;

// The level view's pointer: every press, move and release on the element goes to the ToolController in
// level positions, and the wheel zooms or pans the ViewState. The pointer is captured while a button
// is held, so a drag goes on outside the element. The window losing focus, or the browser taking the
// pointer, cancels the drag.
export class PointerInput {
    private readonly parts: PointerInputParts;
    private readonly element: HTMLElement;
    private readonly page: Window;
    private readonly clicks = new ClickCounter();
    private lastClickCount = 1;

    constructor(parts: PointerInputParts, element: HTMLElement, page: Window) {
        this.parts = parts;
        this.element = element;
        this.page = page;
    }

    connect(): Unsubscribe {
        const element = this.element;
        const notPassive = { passive: false };
        const handleDown = (event: PointerEvent) => this.handleDown(event);
        const handleMove = (event: PointerEvent) => this.handleMove(event);
        const handleUp = (event: PointerEvent) => this.handleUp(event);
        const handleCancel = () => this.parts.escape.dragLost();
        const handleLeave = () => this.parts.mouse.leave();
        const handleMouseDown = (event: MouseEvent) => stopAutoscroll(event);
        const handleWheel = (event: WheelEvent) => this.handleWheel(event);
        const handleBlur = (event: FocusEvent) => this.handleBlur(event);

        element.addEventListener('pointerdown', handleDown);
        element.addEventListener('pointermove', handleMove);
        element.addEventListener('pointerup', handleUp);
        element.addEventListener('pointercancel', handleCancel);
        element.addEventListener('pointerleave', handleLeave);
        element.addEventListener('mousedown', handleMouseDown);
        element.addEventListener('wheel', handleWheel, notPassive);
        this.page.addEventListener('blur', handleBlur);

        return () => {
            element.removeEventListener('pointerdown', handleDown);
            element.removeEventListener('pointermove', handleMove);
            element.removeEventListener('pointerup', handleUp);
            element.removeEventListener('pointercancel', handleCancel);
            element.removeEventListener('pointerleave', handleLeave);
            element.removeEventListener('mousedown', handleMouseDown);
            element.removeEventListener('wheel', handleWheel);
            this.page.removeEventListener('blur', handleBlur);
        };
    }

    private get isRunGoing() {
        return this.parts.play?.isRunGoing === true;
    }

    private handleDown(event: PointerEvent) {
        const button = buttonOf(event.button);
        if (button === undefined) return;
        if (this.isRunGoing) {
            stopAutoscroll(event);
            return;
        }

        stopAutoscroll(event);
        capture(this.element, event.pointerId);
        const screenPosition = this.screenPositionOf(event);
        this.lastClickCount = this.clicks.press(button, screenPosition, event.timeStamp);
        const input = this.inputOf(event, button, screenPosition);
        this.parts.mouse.moveTo(input.levelPosition, screenPosition);
        this.parts.tools.pointerDown(input);
    }

    // A second button going down or up while one is held comes as a move, not a press or release.
    private handleMove(event: PointerEvent) {
        if (this.isRunGoing) return;

        const button = buttonOf(event.button);
        if (event.button !== NO_BUTTON_CHANGE && button !== undefined) {
            this.handleChord(event, button);
            return;
        }

        const screenPosition = this.screenPositionOf(event);
        const heldButton = heldButtonOf(event);
        const input = this.inputOf(event, heldButton, screenPosition);
        this.parts.mouse.moveTo(input.levelPosition, screenPosition);
        this.parts.tools.pointerMove(input);
    }

    private handleChord(event: PointerEvent, button: PointerButton) {
        if (isHeld(event, button)) {
            this.handleDown(event);
            return;
        }

        this.handleUp(event);
    }

    private handleUp(event: PointerEvent) {
        const button = buttonOf(event.button);
        if (button === undefined) return;

        const screenPosition = this.screenPositionOf(event);
        this.parts.tools.pointerUp(this.inputOf(event, button, screenPosition));
    }

    // The wheel zooms at the mouse, a notch a ZOOM_STEP, so a trackpad's small steps add up; a pinch
    // comes as Ctrl+wheel and zooms the same. Shift+wheel pans sideways. The page itself never zooms
    // or scrolls.
    private handleWheel(event: WheelEvent) {
        event.preventDefault();
        if (this.isRunGoing) return;

        const view = this.parts.view;
        const pageHeight = view.size.height;

        if (event.shiftKey) {
            // Browsers turn Shift+wheel into deltaX, some of them only.
            const delta = event.deltaX === 0 ? event.deltaY : event.deltaX;
            view.panBy(-wheelPixels(delta, event.deltaMode, pageHeight), 0);
            return;
        }

        const notches = wheelPixels(event.deltaY, event.deltaMode, pageHeight) / NOTCH_PX;
        if (notches === 0) return;

        const zoom = view.zoom * ZOOM_STEP ** -notches;
        view.zoomAt(this.screenPositionOf(event), zoom);
    }

    // An element losing focus reaches the window's listeners too; only the window's own blur counts.
    private handleBlur(event: FocusEvent) {
        if (event.target !== this.page) return;

        this.parts.escape.focusLost();
    }

    private inputOf(event: PointerEvent, button: PointerButton, screenPosition: Point): LevelPointerInput {
        const isMac = this.parts.platform === 'mac';

        return {
            levelPosition: this.parts.view.screenToLevel(screenPosition),
            screenPosition,
            button,
            modifiers: { shift: event.shiftKey, alt: event.altKey, ctrl: isMac ? event.metaKey : event.ctrlKey },
            clickCount: this.lastClickCount,
        };
    }

    // CSS pixels from the element's top left corner. Browser zoom keeps CSS pixels as they are; a CSS
    // scale on the page is undone, so the position matches the ViewState's size.
    private screenPositionOf(event: MouseEvent): Point {
        const box = this.element.getBoundingClientRect();
        const scaleX = scaleOf(box.width, this.element.offsetWidth);
        const scaleY = scaleOf(box.height, this.element.offsetHeight);

        return { x: (event.clientX - box.left) / scaleX, y: (event.clientY - box.top) / scaleY };
    }
}

function buttonOf(eventButton: number) {
    const found = BUTTONS.find(([number]) => number === eventButton);

    return found?.[2];
}

// The button a move drags with: the first one held, left when none is.
function heldButtonOf(event: PointerEvent): PointerButton {
    const held = BUTTONS.find(([, bit]) => (event.buttons & bit) !== 0);

    return held?.[2] ?? 'left';
}

function isHeld(event: PointerEvent, button: PointerButton) {
    const found = BUTTONS.find(([, , name]) => name === button);
    if (found === undefined) return false;

    return (event.buttons & found[1]) !== 0;
}

// The middle button's autoscroll starts on its press; stopping that press stops it.
function stopAutoscroll(event: MouseEvent) {
    if (event.button !== MIDDLE_BUTTON) return;

    event.preventDefault();
}

// An event made up by a test has no real pointer to capture.
function capture(element: HTMLElement, pointerId: number) {
    try {
        element.setPointerCapture(pointerId);
    } catch {
        return;
    }
}

function scaleOf(shownSize: number, layoutSize: number) {
    if (layoutSize === 0 || shownSize === 0) return 1;

    return shownSize / layoutSize;
}
