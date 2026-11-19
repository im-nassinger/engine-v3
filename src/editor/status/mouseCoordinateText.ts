// One coordinate of the mouse in whole level pixels, with the minus sign the editor's texts use and never
// "−0". Nothing while the mouse is outside the level view.
export function mouseCoordinateText(coordinate: number | undefined) {
    if (coordinate === undefined) return '';

    const rounded = Math.round(coordinate) + 0;
    if (rounded < 0) return `−${String(-rounded)}`;

    return String(rounded);
}
