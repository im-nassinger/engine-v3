const PERCENT = 100;

// The zoom as a whole percentage, as the debug box shows it.
export function zoomPercentText(zoom: number) {
    const percent = Math.round(zoom * PERCENT);

    return `${percent}%`;
}
