// How near the list's top or bottom edge the pointer starts scrolling it, a little more than a row.
const EDGE_ZONE = 40;
// Pixels per second with the pointer on the edge or past it, 20 a frame at 60 frames a second. A
// speed per second, not per frame, scrolls as far on a slow machine or a 120 Hz screen.
const FASTEST = 1200;

// The list's top and bottom on screen, in the pointer's coordinates.
export type ListEdges = {
    readonly top: number;
    readonly bottom: number;
};

// In pixels per second: negative scrolls up, positive down, 0 away from both edges. Faster the
// closer the pointer is.
export function autoScrollSpeed(pointerY: number, edges: ListEdges) {
    const fromTop = pointerY - edges.top;
    if (fromTop < EDGE_ZONE) return -speedAt(fromTop);

    const fromBottom = edges.bottom - pointerY;
    if (fromBottom < EDGE_ZONE) return speedAt(fromBottom);

    return 0;
}

function speedAt(distanceFromEdge: number) {
    const closeness = 1 - Math.max(distanceFromEdge, 0) / EDGE_ZONE;

    return FASTEST * closeness;
}

// A frame longer than this, such as after the tab was hidden, scrolls only this far.
const LONGEST_FRAME_MS = 100;

// The whole pixels to scroll for one frame, at least 1 when moving, so slow speeds still move.
export function autoScrollStep(speed: number, frameMs: number) {
    if (speed === 0) return 0;

    const pixels = Math.ceil((Math.abs(speed) * Math.min(frameMs, LONGEST_FRAME_MS)) / 1000);

    return Math.sign(speed) * pixels;
}
