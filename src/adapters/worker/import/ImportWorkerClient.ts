import type { LevelData, ReadOutcome } from '../../../core/level-data/index.ts';
import type { FileImporter } from '../../../editor/saving/index.ts';

import type { ImportAnswer, ImportRequest } from './importProtocol.ts';

// The page's side of the import worker. Each file gets a new worker, ended after its answer, so the memory a
// big file took is given back at once and one file can't leave anything behind for the next.
export class ImportWorkerClient implements FileImporter {
    private readonly createWorker: () => Worker;

    constructor(createWorker: () => Worker) {
        this.createWorker = createWorker;
    }

    importFile(bytes: ArrayBuffer): Promise<ReadOutcome<LevelData>> {
        const worker = this.createWorker();

        return new Promise<ReadOutcome<LevelData>>((resolve, reject) => {
            worker.onmessage = (event: MessageEvent<ImportAnswer>) => {
                const answer = event.data;
                if (answer.kind === 'checked') {
                    resolve(answer.outcome);
                } else {
                    reject(new Error(`The import worker failed: ${answer.detail}`));
                }
            };
            worker.onerror = (event) => {
                reject(new Error(`The import worker failed: ${event.message}`));
            };
            worker.onmessageerror = () => {
                reject(new Error('The import worker answered with data that could not be read.'));
            };
            const request: ImportRequest = { bytes };
            worker.postMessage(request, [bytes]);
        }).finally(() => {
            worker.terminate();
        });
    }
}
