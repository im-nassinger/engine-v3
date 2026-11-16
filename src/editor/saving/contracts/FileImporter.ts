import type { LevelData, ReadOutcome } from '../../../core/level-data/index.ts';

// Reads a project file away from the page and answers with its level, already checked, or the refusal:
// ImportWorkerClient, which runs ImportCheck in the import worker. The bytes are handed over, not copied, so
// the caller can't use them afterwards.
export type FileImporter = {
    importFile(bytes: ArrayBuffer): Promise<ReadOutcome<LevelData>>;
};
