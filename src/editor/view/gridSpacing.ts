// Lines closer than this on screen are left out, so the grid never turns into a grey wash.
export const MIN_LINE_SPACING_PX = 8;
// Zoomed out, the grid keeps every fifth line, then every 25th, as the lines get too close.
export const LINES_KEPT_EVERY = 5;

// The distance between the grid lines drawn at this zoom, which is also where grid snapping goes: the grid
// size, times five as often as needed to keep the lines 8 screen px apart, so zooming far out never draws
// thousands of them.
export function gridStepAt(gridSize: number, zoom: number) {
    let step = gridSize;
    while (step * zoom < MIN_LINE_SPACING_PX) {
        step *= LINES_KEPT_EVERY;
    }

    return step;
}
