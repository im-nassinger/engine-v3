import type { Level } from '../../../core/level/index.ts';
import type { LevelReader, ReadOutcome } from '../../../core/level-data/index.ts';

import type { FileImporter } from '../contracts/FileImporter.ts';
import type { PickedFile } from '../contracts/FilePicker.ts';

export type LevelImportOptions = {
    readonly importer: FileImporter;
    readonly reader: LevelReader;
};

// The page's half of Import: the file's bytes go to the import worker, and the LevelData it answers with is
// read again into a Level, since a Level can't cross from the worker. Nothing changes here: the caller
// replaces the open level only with a level this gives.
export class LevelImport {
    private readonly options: LevelImportOptions;

    constructor(options: LevelImportOptions) {
        this.options = options;
    }

    async read(file: PickedFile): Promise<ReadOutcome<Level>> {
        let bytes: ArrayBuffer;
        try {
            bytes = await file.read();
        } catch {
            return couldNotRead('the file could not be read');
        }

        let checked;
        try {
            checked = await this.options.importer.importFile(bytes);
        } catch {
            return couldNotRead('the import worker failed');
        }
        if (!checked.ok) return checked;

        return this.options.reader.read(checked.value);
    }
}

// A file the browser or the worker couldn't read counts as damaged, so it has the same plain message.
function couldNotRead(detail: string): ReadOutcome<never> {
    return { ok: false, refusal: { reason: 'damaged', detail } };
}
