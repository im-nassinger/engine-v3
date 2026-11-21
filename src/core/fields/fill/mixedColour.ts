import { channelsOf, storedColourOf } from './colourChannels.ts';
import type { Channels } from './colourChannels.ts';
import type { ColourStop, Fill } from './Fill.ts';

// Each channel averaged over the bar from 0 to 1: the first stop's colour before it, the last one's after it,
// and between two stops the colour that blends from one to the other, which averages to their middle.
function averageOverBar(stops: readonly ColourStop[]): Channels {
    const first = stops[0];
    const last = stops.at(-1);
    if (first === undefined || last === undefined) return [0, 0, 0, 0];

    const firstChannels = channelsOf(first.colour);
    const lastChannels = channelsOf(last.colour);
    const sums = firstChannels.map((channel) => channel * first.place);

    for (let index = 1; index < stops.length; index += 1) {
        const from = stops[index - 1];
        const to = stops[index];
        if (from === undefined || to === undefined) continue;

        const width = to.place - from.place;
        const fromChannels = channelsOf(from.colour);
        const toChannels = channelsOf(to.colour);
        for (let channel = 0; channel < sums.length; channel += 1) {
            sums[channel] =
                (sums[channel] ?? 0) + (((fromChannels[channel] ?? 0) + (toChannels[channel] ?? 0)) / 2) * width;
        }
    }

    const afterLast = 1 - last.place;
    return sums.map((sum, channel) => sum + (lastChannels[channel] ?? 0) * afterLast);
}

// One #RRGGBBAA colour for a fill, for what is too small to show a gradient (the minimap) and for asking
// whether the World's fill is dark. A gradient's stops are mixed, each weighted by how much of the bar it
// covers; the stops must be sorted by place, as FillFieldType keeps them. No fill gives undefined.
export function mixedColour(fill: Fill): string | undefined {
    switch (fill.kind) {
        case 'none':
            return undefined;
        case 'solid':
            return fill.colour;
        case 'linear':
        case 'radial':
            return storedColourOf(averageOverBar(fill.stops));
    }
}
