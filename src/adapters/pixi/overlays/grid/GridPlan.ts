import { Bounds } from '../../../../core/geometry/index.ts';
import { gridStepAt } from '../../../../editor/view/index.ts';

export type GridLineStrength = 'step' | 'origin';

export type GridLine = {
    // A level x for a vertical line, a level y for a horizontal one.
    readonly position: number;
    readonly strength: GridLineStrength;
};

export type GridPlan = {
    // The level distance between two lines.
    readonly step: number;
    readonly vertical: readonly GridLine[];
    readonly horizontal: readonly GridLine[];
};

export type GridPlanInput = {
    readonly visible: Bounds;
    readonly zoom: number;
    readonly gridSize: number;
};

// Every line from low to high, counted from the origin, so the origin line is found from a whole number and
// never from comparing positions that rounding has moved.
function linesBetween(low: number, high: number, step: number) {
    const firstIndex = Math.ceil(low / step);
    const lastIndex = Math.floor(high / step);

    const lines: GridLine[] = [];
    for (let index = firstIndex; index <= lastIndex; index++) {
        // Math.ceil of a small negative number is -0, which the origin line shouldn't carry.
        if (index === 0) {
            lines.push({ position: 0, strength: 'origin' });
        } else {
            lines.push({ position: index * step, strength: 'step' });
        }
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
    const step = gridStepAt(input.gridSize, input.zoom);
    const visible = input.visible;

    return {
        step,
        vertical: linesBetween(visible.left, visible.right, step),
        horizontal: linesBetween(visible.top, visible.bottom, step),
    };
}
