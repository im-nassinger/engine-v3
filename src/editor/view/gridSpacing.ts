// Lines closer than this on screen are left out, so the grid never turns into a grey wash.
export const MIN_LINE_SPACING_PX = 8;
// The fainter lines split each grid step in five: every 10 px for the default 50 px grid.
export const FINE_LINES_PER_STEP = 5;

export type GridSpacing = {
    // The level distance between the stronger lines.
    readonly step: number;
    // The distance between the fainter lines, undefined when they would be too close on screen.
    readonly fineStep: number | undefined;
};

// The step is the grid size, times five as often as needed to keep the lines 8 screen px apart, so zooming
// far out shows every fifth line, then every 25th, and never thousands of them.
export function gridSpacingAt(gridSize: number, zoom: number): GridSpacing {
    let step = gridSize;
    while (step * zoom < MIN_LINE_SPACING_PX) {
        step *= FINE_LINES_PER_STEP;
    }

    const fineStep = step / FINE_LINES_PER_STEP;
    const fineIsShown = fineStep * zoom >= MIN_LINE_SPACING_PX;

    return { step, fineStep: fineIsShown ? fineStep : undefined };
}

// The distance between the lines grid snapping goes to: the finest lines drawn at this zoom, so what you
// move lands on a line you can see. The fainter lines count only when they are whole pixels apart, which
// keeps snapped positions whole (a 7 px grid's would be 1.4 px apart).
export function gridSnapStepAt(gridSize: number, zoom: number) {
    const spacing = gridSpacingAt(gridSize, zoom);
    const fineStep = spacing.fineStep;
    if (fineStep === undefined) return spacing.step;
    if (!Number.isInteger(fineStep)) return spacing.step;

    return fineStep;
}
