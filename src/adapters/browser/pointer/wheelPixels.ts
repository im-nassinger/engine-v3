// One notch of a mouse wheel, as Chrome reports it in pixels; Firefox reports 3 lines.
export const NOTCH_PX = 100;
const LINES_PER_NOTCH = 3;
const LINE_PX = NOTCH_PX / LINES_PER_NOTCH;

const DOM_DELTA_LINE = 1;
const DOM_DELTA_PAGE = 2;

// A wheel event's delta in pixels, whichever unit the browser reported it in. A page is the view's height.
export function wheelPixels(delta: number, deltaMode: number, pageHeightPx: number) {
    if (deltaMode === DOM_DELTA_LINE) return delta * LINE_PX;
    if (deltaMode === DOM_DELTA_PAGE) return delta * pageHeightPx;

    return delta;
}
