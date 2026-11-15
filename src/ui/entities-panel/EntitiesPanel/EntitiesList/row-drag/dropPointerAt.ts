import type { DropPointer } from '../../../../../editor/entities-panel/index.ts';
import { ROW_HEIGHT, depthAtIndent } from '../rowLayout.ts';

// Where the pointer is from the top left of the list's content, which scrolls with the rows.
export type ContentPoint = {
    readonly x: number;
    readonly y: number;
};

// Above the first row counts as its top edge and past the last row as its bottom edge, so a drag
// out of the list still points somewhere.
export function dropPointerAt(point: ContentPoint, rowCount: number): DropPointer | undefined {
    if (rowCount === 0) return undefined;

    const pointerDepth = depthAtIndent(point.x);
    if (point.y < 0) return { rowIndex: 0, heightFraction: 0, pointerDepth };

    const rowIndex = Math.floor(point.y / ROW_HEIGHT);
    if (rowIndex >= rowCount) return { rowIndex: rowCount - 1, heightFraction: 1, pointerDepth };

    const heightFraction = (point.y - rowIndex * ROW_HEIGHT) / ROW_HEIGHT;

    return { rowIndex, heightFraction, pointerDepth };
}
