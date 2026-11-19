const PERCENT = 100;

export const ZOOM_NOT_A_NUMBER = 'Type the zoom as a percentage, such as 150';

// The zoom as a whole percentage, as the debug box shows it.
export function zoomPercentText(zoom: number) {
    const percent = Math.round(zoom * PERCENT);

    return `${percent}%`;
}

// The zoom a typed percentage asks for, such as `150` or `150%`, or undefined when it isn't a positive number.
// The view keeps it inside its own range.
export function zoomFromPercentText(text: string) {
    const trimmed = text.trim().replace(/%$/, '').trim();
    const percent = Number(trimmed);
    if (trimmed.length === 0 || !Number.isFinite(percent) || percent <= 0) return undefined;

    return percent / PERCENT;
}
