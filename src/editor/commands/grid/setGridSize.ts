import { LevelEditorData } from '../../../core/level/index.ts';
import { SetGridSizeChange } from '../../history/index.ts';
import type { EditOutcome } from '../../history/index.ts';
import type { OpenLevel } from '../../session/index.ts';

export const GRID_SIZE_NOT_A_NUMBER = 'Type the grid size as a number of pixels';

// The grid size typed in the debug box, one undo step. A whole number of pixels from 5 to 1,000: a decimal
// is rounded and a size past either end is kept at that end, as the level keeps it. The same size makes no step.
export function setGridSize(openLevel: OpenLevel, text: string): EditOutcome {
    const { level, editor } = openLevel;

    const trimmed = text.trim().replace(/px$/i, '').trim();
    const typed = Number(trimmed);
    if (trimmed.length === 0 || !Number.isFinite(typed)) return { kind: 'refused', reason: GRID_SIZE_NOT_A_NUMBER };

    const rounded = Math.round(typed);
    const newSize = Math.min(Math.max(rounded, LevelEditorData.minGridSize), LevelEditorData.maxGridSize);
    const oldSize = level.editorData.gridSize;
    if (newSize === oldSize) return { kind: 'done' };

    const change = new SetGridSizeChange(oldSize, newSize);

    return editor.edit('Change grid size', (transaction) => {
        transaction.apply(change);
        return { kind: 'done' };
    });
}
