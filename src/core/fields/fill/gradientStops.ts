import { channelsOf, storedColourOf } from './colourChannels.ts';
import type { ColourStop } from './Fill.ts';

// Stops after an edit, sorted by place as FillFieldType keeps them, with where the edited stop went, so the
// chosen stop stays chosen.
export type EditedStops = {
    readonly stops: readonly ColourStop[];
    readonly index: number;
};

// The colour a gradient has at a place on its bar: the first stop's before it, the last one's after it, and
// between two stops each channel blended on its own, as PixiJS draws it. The stops must be sorted by place.
export function colourAt(stops: readonly ColourStop[], place: number): string {
    const first = stops[0];
    const last = stops.at(-1);
    if (first === undefined || last === undefined) throw new Error('A gradient has at least 2 stops.');

    if (place <= first.place) return first.colour;
    if (place >= last.place) return last.colour;

    const toIndex = stops.findIndex((stop) => stop.place > place);
    const from = stops[toIndex - 1];
    const to = stops[toIndex];
    if (from === undefined || to === undefined) return last.colour;

    const share = (place - from.place) / (to.place - from.place);
    const fromChannels = channelsOf(from.colour);
    const toChannels = channelsOf(to.colour);
    const blended = fromChannels.map((channel, index) => channel + ((toChannels[index] ?? 0) - channel) * share);

    return storedColourOf(blended);
}

// `+ Add stop`: a stop in the middle of the widest gap between two neighbouring stops, the first such gap
// when several are as wide, with the colour already there so the look doesn't change.
export function withStopAdded(stops: readonly ColourStop[]): EditedStops {
    let widestIndex = 1;
    let widestGap = -1;
    for (let index = 1; index < stops.length; index += 1) {
        const gap = (stops[index]?.place ?? 0) - (stops[index - 1]?.place ?? 0);
        if (gap <= widestGap) continue;

        widestGap = gap;
        widestIndex = index;
    }

    const place = (stops[widestIndex - 1]?.place ?? 0) + widestGap / 2;
    const stop = { colour: colourAt(stops, place), place };

    return withStopChanged([...stops.slice(0, widestIndex), stop, ...stops.slice(widestIndex)], widestIndex, stop);
}

// The stop at index taken out; the stop after it is chosen, or the new last one.
export function withoutStop(stops: readonly ColourStop[], index: number): EditedStops {
    const left = stops.filter((_, stopIndex) => stopIndex !== index);

    return { stops: left, index: Math.min(index, left.length - 1) };
}

// The stop at index replaced, then the stops sorted by place, keeping the order of equal places as
// FillFieldType's normalize does.
export function withStopChanged(stops: readonly ColourStop[], index: number, stop: ColourStop): EditedStops {
    const indexed = stops.map((oldStop, stopIndex) => ({ stop: stopIndex === index ? stop : oldStop, stopIndex }));
    const sorted = indexed.sort((first, second) => first.stop.place - second.stop.place);

    return {
        stops: sorted.map((entry) => entry.stop),
        index: sorted.findIndex((entry) => entry.stopIndex === index),
    };
}
