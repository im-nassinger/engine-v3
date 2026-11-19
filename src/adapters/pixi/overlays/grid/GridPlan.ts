import { Bounds } from '../../../../core/geometry/index.ts';

// Lines closer than this on screen are left out, so the grid never turns into a grey wash.
export const MIN_LINE_SPACING_PX = 8;
// The fainter lines split each grid step in five: every 10 px for the default 50 px grid.
export const FINE_LINES_PER_STEP = 5;

export type GridLineStrength = 'fine' | 'step' | 'origin';

export type GridLine = {
    // A level x for a vertical line, a level y for a horizontal one.
    readonly position: number;
    readonly strength: GridLineStrength;
};

export type GridSpacing = {
    // The level distance between the stronger lines.
    readonly step: number;
    // The distance between the fainter lines, undefined when they would be too close on screen.
    readonly fineStep: number | undefined;
};

export type GridPlan = {
    readonly spacing: GridSpacing;
    readonly vertical: readonly GridLine[];
    readonly horizontal: readonly GridLine[];
};

export type GridPlanInput = {
    readonly visible: Bounds;
    readonly zoom: number;
    readonly gridSize: number;
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

function strengthOf(index: number, linesPerStep: number): GridLineStrength {
    if (index === 0) return 'origin';
    if (index % linesPerStep === 0) return 'step';

    return 'fine';
}

// Every line from low to high, counted from the origin, so a line's strength comes from a whole number and
// never from comparing positions that rounding has moved.
function linesBetween(low: number, high: number, spacing: GridSpacing) {
    const lineStep = spacing.fineStep ?? spacing.step;
    const linesPerStep = spacing.fineStep === undefined ? 1 : FINE_LINES_PER_STEP;
    const firstIndex = Math.ceil(low / lineStep);
    const lastIndex = Math.floor(high / lineStep);

    const lines: GridLine[] = [];
    for (let index = firstIndex; index <= lastIndex; index++) {
        const strength = strengthOf(index, linesPerStep);
        // Math.ceil of a small negative number is -0, which the origin line shouldn't carry.
        const position = index === 0 ? 0 : index * lineStep;
        lines.push({ position, strength });
    }

    return lines;
}

// The part of the level bounds in view, where the grid is drawn. undefined when none of them is.
export function gridAreaOf(visible: Bounds, levelBounds: Bounds) {
    if (!visible.overlaps(levelBounds)) return undefined;

    return new Bounds(
        Math.max(visible.left, levelBounds.left),
        Math.max(visible.top, levelBounds.top),
        Math.min(visible.right, levelBounds.right),
        Math.min(visible.bottom, levelBounds.bottom),
    );
}

// The grid lines across this rectangle of the level.
export function planGrid(input: GridPlanInput): GridPlan {
    const spacing = gridSpacingAt(input.gridSize, input.zoom);
    const visible = input.visible;

    return {
        spacing,
        vertical: linesBetween(visible.left, visible.right, spacing),
        horizontal: linesBetween(visible.top, visible.bottom, spacing),
    };
}
