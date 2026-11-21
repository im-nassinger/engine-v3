import type { ColourStop, Fill, FillKind } from './Fill.ts';
import { DEFAULT_FILL_COLOUR } from './Fill.ts';

const OPAQUE_DIGITS_END = 7;
const SEE_THROUGH = '00';

// The colour a fill switched to Solid, or to a gradient from Solid, starts from.
function colourOf(fill: Fill) {
    switch (fill.kind) {
        case 'none':
            return DEFAULT_FILL_COLOUR;
        case 'solid':
            return fill.colour;
        case 'linear':
        case 'radial':
            return fill.stops[0]?.colour ?? DEFAULT_FILL_COLOUR;
    }
}

// A gradient keeps its stops; any other fill starts with its colour, and the same colour fully see-through.
function stopsOf(fill: Fill): readonly ColourStop[] {
    if (fill.kind === 'linear' || fill.kind === 'radial') return fill.stops;

    const colour = colourOf(fill);
    const seeThrough = colour.slice(0, OPAQUE_DIGITS_END) + SEE_THROUGH;
    return [
        { colour, place: 0 },
        { colour: seeThrough, place: 1 },
    ];
}

// The requirement's rules for the Fill's choice of None, Solid, Linear and Radial. A new linear gradient runs
// left to right across the middle, and a new radial one sits in the middle, touching every side.
export function switchFillKind(fill: Fill, kind: FillKind): Fill {
    if (fill.kind === kind) return fill;

    switch (kind) {
        case 'none':
            return { kind: 'none' };
        case 'solid':
            return { kind: 'solid', colour: colourOf(fill) };
        case 'linear':
            return { kind: 'linear', stops: stopsOf(fill), start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } };
        case 'radial':
            return { kind: 'radial', stops: stopsOf(fill), centre: { x: 0.5, y: 0.5 }, radius: 0.5 };
    }
}
