import { LevelEditorData } from '../../../core/level/index.ts';
import { READ_ONLY_REASON } from '../../history/index.ts';
import type { EditOutcome } from '../../history/index.ts';
import type { OpenLevel } from '../../session/index.ts';

export const GRID_SIZE_NOT_A_NUMBER = 'Type the grid size as a number of pixels';

// The grid size typed in the debug box. Saved with the level but never an undo step (owner, 2026-11-19).
// A whole number of pixels from 5 to 1,000: a decimal is rounded and a size past either end is kept at that end,
// as the level keeps it. A read-only tab refuses it, since it would change what the other tab saves.
export function setGridSize(openLevel: OpenLevel, text: string): EditOutcome {
    const { level, editor } = openLevel;
    if (editor.isReadOnly) return { kind: 'refused', reason: READ_ONLY_REASON };

    const trimmed = text.trim().replace(/px$/i, '').trim();
    const typed = Number(trimmed);
    if (trimmed.length === 0 || !Number.isFinite(typed)) return { kind: 'refused', reason: GRID_SIZE_NOT_A_NUMBER };

    const rounded = Math.round(typed);
    const newSize = Math.min(Math.max(rounded, LevelEditorData.minGridSize), LevelEditorData.maxGridSize);
    level.editorData.setGridSize(newSize);

    return { kind: 'done' };
}
