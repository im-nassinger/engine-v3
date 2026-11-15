// A stored #RRGGBBAA colour as the number and alpha PixiJS takes for a fill or a stroke.
export type PixiColour = {
    readonly color: number;
    readonly alpha: number;
};

const LARGEST_CHANNEL = 255;

export function toPixiColour(storedColour: string): PixiColour {
    const redGreenBlueDigits = storedColour.slice(1, 7);
    const alphaDigits = storedColour.slice(7, 9);
    const color = Number.parseInt(redGreenBlueDigits, 16);
    const alphaChannel = Number.parseInt(alphaDigits, 16);

    return { color, alpha: alphaChannel / LARGEST_CHANNEL };
}
