import type { LevelExport } from '../../saving/index.ts';

// What the File menu's commands share besides the session. New and Import join it.
export type FileParts = {
    readonly levelExport: LevelExport;
};
