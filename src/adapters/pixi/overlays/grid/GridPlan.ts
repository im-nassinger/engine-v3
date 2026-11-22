import { Bounds } from '../../../../core/geometry/index.ts';
import { FINE_LINES_PER_STEP, gridSpacingAt } from '../../../../editor/view/index.ts';
import type { GridSpacing } from '../../../../editor/view/index.ts';

export type GridLineStrength = 'fine' | 'step' | 'origin';

export type GridLine = {
    // A level x for a vertical line, a level y for a horizontal one.
    readonly position: number;
    readonly strength: GridLineStrength;
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
