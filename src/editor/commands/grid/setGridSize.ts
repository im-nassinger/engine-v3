import { LevelEditorData } from '../../../core/level/index.ts';
import { READ_ONLY_REASON } from '../../history/index.ts';
import type { EditOutcome } from '../../history/index.ts';
import type { OpenLevel } from '../../session/index.ts';
import type { LengthDisplay } from '../../units/index.ts';

export const GRID_SIZE_NOT_A_NUMBER = 'Type the grid size as a number, such as 1';

const UNIT_SUFFIX = /(px|m)$/i;

// The grid size typed in the debug box, in ☰'s unit. Saved with the level but never an undo step (owner,
// 2026-11-19). Stored as a whole number of pixels from 5 to 1,000, which is 0.05 to 10 m in steps of
// 0.01 m at 100 px per metre: a typed size is rounded to a pixel and one past either end is kept at that
// end, as the level keeps it. A read-only tab refuses it, since it would change what the other tab saves.
export function setGridSize(openLevel: OpenLevel, text: string, lengths: LengthDisplay): EditOutcome {
    const { level, editor } = openLevel;
    if (editor.isReadOnly) return { kind: 'refused', reason: READ_ONLY_REASON };

    const trimmed = text.trim().replace(UNIT_SUFFIX, '').trim();
    const typed = Number(trimmed);
    if (trimmed.length === 0 || !Number.isFinite(typed)) return { kind: 'refused', reason: GRID_SIZE_NOT_A_NUMBER };

    const pixels = lengths.toPixels(typed);
    const rounded = Math.round(pixels);
    const newSize = Math.min(Math.max(rounded, LevelEditorData.minGridSize), LevelEditorData.maxGridSize);
    level.editorData.setGridSize(newSize);

    return { kind: 'done' };
}
