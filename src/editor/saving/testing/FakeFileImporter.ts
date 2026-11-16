import type { LevelData, ReadOutcome } from '../../../core/level-data/index.ts';

import type { FileImporter } from '../contracts/FileImporter.ts';

// A FileImporter for tests: answers every file with the outcome set, or rejects when it is an Error, and
// keeps how many files it was given.
export class FakeFileImporter implements FileImporter {
    answer: ReadOutcome<LevelData> | Error = { ok: false, refusal: { reason: 'notALevel' } };
    importedCount = 0;

    importFile(): Promise<ReadOutcome<LevelData>> {
        this.importedCount += 1;
        if (this.answer instanceof Error) return Promise.reject(this.answer);

        return Promise.resolve(this.answer);
    }
}
