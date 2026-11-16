import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import type { Point } from '../../../core/geometry/index.ts';
import type { LevelPointerInput } from '../../../editor/tools/index.ts';
import { ViewState } from '../../../editor/view/index.ts';
import { PointerInput } from './PointerInput.ts';

const VIEW_WIDTH = 400;
const VIEW_HEIGHT = 300;
// Where the level view sits on the page.
const VIEW_LEFT = 50;
const VIEW_TOP = 40;

class RecordingTools {
    readonly heard: string[] = [];
    readonly inputs: LevelPointerInput[] = [];

    pointerDown(input: LevelPointerInput) {
        this.record(`down ${input.button}`, input);
    }

    pointerMove(input: LevelPointerInput) {
        this.record('move', input);
    }

    pointerUp(input: LevelPointerInput) {
        this.record(`up ${input.button}`, input);
    }

    get last() {
        const input = this.inputs.at(-1);
        if (input === undefined) throw new Error('No pointer event reached the tools');

        return input;
    }

    private record(heard: string, input: LevelPointerInput) {
        this.heard.push(heard);
        this.inputs.push(input);
    }
}

class RecordingEscape {
    readonly heard: string[] = [];

    dragLost() {
        this.heard.push('dragLost');
    }

    focusLost() {
        this.heard.push('focusLost');
    }
}

class RecordingMouse {
    readonly positions: (Point | undefined)[] = [];

    moveTo(levelPosition: Point) {
        this.positions.push(levelPosition);
    }

    leave() {
        this.positions.push(undefined);
    }
}

let page: HTMLElement;
let element: HTMLElement;
let view: ViewState;
let tools: RecordingTools;
let escape: RecordingEscape;
let mouse: RecordingMouse;
let disconnect: () => void;
// Each test's presses come later than the last test's, so no double-click runs across tests.
let timeMs = 0;

beforeEach(() => {
    page = document.createElement('div');
    page.style.cssText = `position: fixed; left: 0; top: 0; transform-origin: 0 0;`;
    element = document.createElement('div');
    element.style.cssText = `position: absolute; left: ${VIEW_LEFT}px; top: ${VIEW_TOP}px; width: ${VIEW_WIDTH}px; height: ${VIEW_HEIGHT}px;`;
    page.append(element);
    document.body.append(page);

    view = new ViewState();
    view.setSize(VIEW_WIDTH, VIEW_HEIGHT);
    tools = new RecordingTools();
    escape = new RecordingEscape();
    mouse = new RecordingMouse();
    const input = new PointerInput({ tools, escape, mouse, view, platform: 'other' }, element, window);
    disconnect = input.connect();
    timeMs += 10_000;
});

afterEach(() => {
    disconnect();
    page.remove();
});

// The page shown at a scale, as browser zoom would, though a test can't set the browser's own zoom.
function scalePage(scale: number) {
    page.style.transform = `scale(${scale})`;
}

// A point in the view, in its own CSS pixels, as the browser reports it on the scaled page.
function clientPoint(viewPoint: Point, scale: number) {
    return { clientX: (VIEW_LEFT + viewPoint.x) * scale, clientY: (VIEW_TOP + viewPoint.y) * scale };
}

type PointerOptions = {
    readonly scale?: number;
    readonly button?: number;
    readonly buttons?: number;
    readonly shiftKey?: boolean;
};

function pointer(type: string, viewPoint: Point, options: PointerOptions = {}) {
    // A real move with no button going down or up reports -1.
    const noButton = type === 'pointermove' ? -1 : 0;
    const { scale = 1, button = noButton, buttons = 0, shiftKey = false } = options;
    const init = { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, button, buttons, shiftKey };
    const event = new PointerEvent(type, { ...init, ...clientPoint(viewPoint, scale) });
    Object.defineProperty(event, 'timeStamp', { value: timeMs });
    element.dispatchEvent(event);

    return event;
}

function click(viewPoint: Point, scale = 1) {
    pointer('pointerdown', viewPoint, { scale, buttons: 1 });
    pointer('pointerup', viewPoint, { scale });
}

function wheel(viewPoint: Point, init: WheelEventInit) {
    const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, ...clientPoint(viewPoint, 1), ...init });
    element.dispatchEvent(event);

    return event;
}

const ZOOMS = [0.5, 4];
const SCALES = [1, 1.5];

describe('PointerInput', () => {
    for (const zoom of ZOOMS) {
        for (const scale of SCALES) {
            test(`a click and a drag reach the tools in level positions at zoom ${zoom} and page scale ${scale}`, () => {
                view.zoomAboutMiddle(zoom);
                scalePage(scale);
                const start = { x: 100, y: 60 };
                const end = { x: 300, y: 200 };

                click(start, scale);
                pointer('pointerdown', start, { scale, buttons: 1 });
                pointer('pointermove', end, { scale, buttons: 1 });
                const moved = tools.last;
                pointer('pointerup', end, { scale });

                expect(tools.heard).toEqual(['down left', 'up left', 'down left', 'move', 'up left']);
                expect(tools.inputs[0]?.screenPosition.x).toBeCloseTo(start.x);
                expect(tools.inputs[0]?.screenPosition.y).toBeCloseTo(start.y);
                expect(moved.levelPosition.x).toBeCloseTo(view.screenToLevel(end).x);
                expect(moved.levelPosition.y).toBeCloseTo(view.screenToLevel(end).y);
                expect(moved.button).toBe('left');
            });
        }
    }

    test('a second press soon after, at the same place, is a double-click', () => {
        click({ x: 10, y: 10 });
        const first = tools.inputs[0];
        timeMs += 200;
        click({ x: 11, y: 10 });

        expect(first?.clickCount).toBe(1);
        expect(tools.inputs[2]?.clickCount).toBe(2);
        expect(tools.last.clickCount).toBe(2);
    });

    test('a press with a second button held comes to the tools as a press, and its release as a release', () => {
        pointer('pointerdown', { x: 10, y: 10 }, { buttons: 1 });
        pointer('pointermove', { x: 10, y: 10 }, { button: 1, buttons: 5 });
        pointer('pointermove', { x: 30, y: 10 }, { button: -1, buttons: 5 });
        pointer('pointermove', { x: 30, y: 10 }, { button: 1, buttons: 1 });
        pointer('pointerup', { x: 30, y: 10 });

        expect(tools.heard).toEqual(['down left', 'down middle', 'move', 'up middle', 'up left']);
    });

    test("the middle button's press is stopped, so the browser never autoscrolls", () => {
        const press = pointer('pointerdown', { x: 10, y: 10 }, { button: 1, buttons: 4 });
        const mouse = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 1 });
        element.dispatchEvent(mouse);

        expect(press.defaultPrevented).toBe(true);
        expect(mouse.defaultPrevented).toBe(true);
    });

    test('the window losing focus cancels the drag; an element losing it does not', () => {
        pointer('pointerdown', { x: 10, y: 10 }, { buttons: 1 });
        element.dispatchEvent(new FocusEvent('blur'));
        window.dispatchEvent(new FocusEvent('blur'));
        pointer('pointercancel', { x: 10, y: 10 });

        expect(escape.heard).toEqual(['focusLost', 'dragLost']);
    });

    test('the wheel zooms a step a notch and keeps the point under the mouse', () => {
        const mouse = { x: 300, y: 100 };
        const levelUnderMouse = view.screenToLevel(mouse);

        const event = wheel(mouse, { deltaY: -100 });

        expect(event.defaultPrevented).toBe(true);
        expect(view.zoom).toBeCloseTo(2);
        expect(view.levelToScreen(levelUnderMouse).x).toBeCloseTo(mouse.x);
        expect(view.levelToScreen(levelUnderMouse).y).toBeCloseTo(mouse.y);
    });

    test("a trackpad's small steps add up to a notch, and three lines are one", () => {
        for (let step = 0; step < 10; step++) {
            wheel({ x: 200, y: 150 }, { deltaY: 10 });
        }
        expect(view.zoom).toBeCloseTo(0.5);

        wheel({ x: 200, y: 150 }, { deltaY: -3, deltaMode: 1 });
        expect(view.zoom).toBeCloseTo(1);
    });

    test('Shift+wheel pans sideways without zooming', () => {
        wheel({ x: 200, y: 150 }, { deltaY: 100, shiftKey: true });

        expect(view.zoom).toBe(1);
        expect(view.middle).toEqual({ x: 100, y: 0 });
    });

    test('hears nothing once disconnected', () => {
        disconnect();
        click({ x: 10, y: 10 });
        wheel({ x: 10, y: 10 }, { deltaY: 100 });

        expect(tools.heard).toEqual([]);
        expect(view.zoom).toBe(1);
    });

    test('the mouse position follows the pointer in level positions and goes when it leaves', () => {
        view.zoomAboutMiddle(2);
        const viewPoint = { x: 100, y: 60 };

        pointer('pointermove', viewPoint);
        pointer('pointerleave', viewPoint);

        const expected = view.screenToLevel(viewPoint);
        expect(mouse.positions).toEqual([expected, undefined]);
    });
});
