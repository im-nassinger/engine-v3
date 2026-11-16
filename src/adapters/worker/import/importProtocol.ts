import type { LevelData, ReadOutcome } from '../../../core/level-data/index.ts';

// What the page sends the import worker: the file's bytes, transferred, not copied.
export type ImportRequest = { readonly bytes: ArrayBuffer };

// The worker's one answer: the check's outcome, or the error the check threw, which is a bug.
export type ImportAnswer =
    | { readonly kind: 'checked'; readonly outcome: ReadOutcome<LevelData> }
    | { readonly kind: 'failed'; readonly detail: string };
