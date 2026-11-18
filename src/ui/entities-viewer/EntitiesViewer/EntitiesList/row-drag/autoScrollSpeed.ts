// How near the list's top or bottom edge the pointer starts scrolling it, a little more than a row.
const EDGE_ZONE = 40;
// Pixels per frame with the pointer on the edge or past it.
const FASTEST = 20;

// The list's top and bottom on screen, in the pointer's coordinates.
export type ListEdges = {
    readonly top: number;
    readonly bottom: number;
};

// Negative scrolls up, positive down, 0 away from both edges. Faster the closer the pointer is.
export function autoScrollSpeed(pointerY: number, edges: ListEdges) {
    const fromTop = pointerY - edges.top;
    if (fromTop < EDGE_ZONE) return -speedAt(fromTop);

    const fromBottom = edges.bottom - pointerY;
    if (fromBottom < EDGE_ZONE) return speedAt(fromBottom);

    return 0;
}

function speedAt(distanceFromEdge: number) {
    const closeness = 1 - Math.max(distanceFromEdge, 0) / EDGE_ZONE;

    return Math.ceil(FASTEST * closeness);
}
