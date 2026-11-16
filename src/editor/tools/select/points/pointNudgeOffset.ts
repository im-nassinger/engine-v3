import type { Point } from '../../../../core/geometry/index.ts';
import type { ToolKey } from '../../Tool.ts';

// The level's y grows downwards.
const ARROW_DIRECTIONS: Readonly<Record<string, Point>> = {
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
};

const SHIFT_STEP_PX = 10;

// An arrow key's nudge of the selected points, with the entities' nudge distances: 1 px, 10 px with
// Shift and one grid step with Ctrl+Shift. undefined for any other key or modifiers.
export function pointNudgeOffset(key: ToolKey, gridSize: number): Point | undefined {
    const direction = ARROW_DIRECTIONS[key.code];
    if (direction === undefined || key.alt) return undefined;

    const pixels = stepOf(key, gridSize);
    if (pixels === undefined) return undefined;

    return { x: direction.x * pixels, y: direction.y * pixels };
}

function stepOf(key: ToolKey, gridSize: number) {
    if (key.ctrl && key.shift) return gridSize;
    if (key.ctrl) return undefined;
    if (key.shift) return SHIFT_STEP_PX;

    return 1;
}
