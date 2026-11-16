import type { FilePicker, LevelExport, LevelImport, SavesNow } from '../../saving/index.ts';
import type { CommandOutcome } from '../EditorCommand.ts';

// Where an outcome goes that comes after the command's run has returned, as an import's refusal does:
// the CommandRunner, so it is shown like any other.
export type LateOutcomes = {
    showOutcome(outcome: CommandOutcome): void;
};

// What the File menu's commands share besides the session.
export type FileParts = {
    readonly levelExport: LevelExport;
    readonly levelImport: LevelImport;
    readonly picker: FilePicker;
    // Autosave: New and Import save the level that replaced the open one at once.
    readonly saving: SavesNow;
    readonly outcomes: LateOutcomes;
};
