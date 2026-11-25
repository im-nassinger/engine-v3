// Where the script hides blocks past an edge, that edge fades them into the card instead of cutting them
// (design/controls.md, v4 fix 4; the mockup's fadeEdges in design/mockups/triggers.html). The fade covers the
// last FADE_PX of the view, or less while less than that is hidden, and only on the edges hiding something.
// A straight fade looked artificial (owner), so it eases (EASE: how opaque, from the edge in) and has a grain:
// the mask is G × (G + N × (1 − G)), G the eased fade and N a noise texture, so the grain is strongest halfway
// through the fade and gone at both its ends.
export const FADE_PX = 24;

const EASE = [0, 0.04, 0.14, 0.3, 0.5, 0.7, 0.86, 0.96, 1];
// Below this many pixels an edge counts as hiding nothing, so a fractional scroll leaves no fade.
const NOTHING_HIDDEN_PX = 0.5;

const NOISE_SVG =
    "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'>" +
    "<feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/>" +
    "<feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 2.6 0 0 0 -.8'/></filter>" +
    "<rect width='100%' height='100%' filter='url(#n)'/></svg>";
const NOISE = `url("data:image/svg+xml,${encodeURIComponent(NOISE_SVG)}")`;

// How many pixels of blocks the view hides past each edge.
export type HiddenPast = {
    top: number;
    bottom: number;
    left: number;
    right: number;
};

export type EdgeFadeMask = {
    image: string;
    composite: string;
};

// The mask for a view hiding `hidden`, or undefined when it hides nothing.
export function edgeFadeMask(hidden: HiddenPast): EdgeFadeMask | undefined {
    const top = Math.min(FADE_PX, hidden.top);
    const bottom = Math.min(FADE_PX, hidden.bottom);
    const left = Math.min(FADE_PX, hidden.left);
    const right = Math.min(FADE_PX, hidden.right);
    const mostHidden = Math.max(top, bottom, left, right);
    if (mostHidden < NOTHING_HIDDEN_PX) return undefined;

    const vertical = fadeAlong('to bottom', top, bottom);
    const horizontal = fadeAlong('to right', left, right);
    const image = [vertical, horizontal, NOISE, vertical, horizontal].join(', ');
    // Read from the last layer up: the two fades intersect into G, the noise adds as G + N × (1 − G), and G
    // intersects that twice more.
    const composite = 'intersect, intersect, add, intersect, add';

    return { image, composite };
}

// One axis's fade: opaque in the middle, eased to clear over `start` px at its start and `end` px at its end.
function fadeAlong(direction: string, start: number, end: number) {
    const startStops = edgeStops(start, (offset) => `${offset}px`);
    const endStops = edgeStops(end, (offset) => `calc(100% - ${offset}px)`).reverse();
    const stops = [...startStops, ...endStops];
    const middle = stops.length === 0 ? '#000' : stops.join(', ');

    return `linear-gradient(${direction}, #000, ${middle}, #000)`;
}

// One edge's stops, from the edge in: none when it hides nothing.
function edgeStops(length: number, position: (offset: number) => string) {
    if (length < NOTHING_HIDDEN_PX) return [];

    const lastStep = EASE.length - 1;
    return EASE.map((opacity, step) => {
        const offset = (length * step) / lastStep;
        return `rgba(0,0,0,${opacity}) ${position(offset)}`;
    });
}
