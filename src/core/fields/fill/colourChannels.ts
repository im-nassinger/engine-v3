// A stored #RRGGBBAA colour as its four channels, 0 to 255, and back, rounded and kept in range.
const LARGEST_CHANNEL = 255;
const CHANNEL_STARTS = [1, 3, 5, 7] as const;

export type Channels = readonly number[];

export function channelsOf(storedColour: string): Channels {
    return CHANNEL_STARTS.map((start) => Number.parseInt(storedColour.slice(start, start + 2), 16));
}

export function storedColourOf(channels: Channels) {
    const digits = channels.map((channel) => {
        const rounded = Math.min(LARGEST_CHANNEL, Math.max(0, Math.round(channel)));
        return rounded.toString(16).padStart(2, '0');
    });

    return `#${digits.join('')}`.toUpperCase();
}
