import type { LevelData, ReadOutcome } from '../../../core/level-data/index.ts';

import type { ImportAnswer, ImportRequest } from './importProtocol.ts';

// The part of the worker's global scope the host uses, so a test can pass a fake.
export type ImportWorkerScope = {
    onmessage: ((event: MessageEvent<ImportRequest>) => void) | null;
    postMessage(answer: ImportAnswer): void;
};

// What the host runs on each file: ImportCheck.
export type ImportChecker = {
    check(bytes: Uint8Array): ReadOutcome<LevelData>;
};

// The import worker's side: runs the check on each file it is sent and answers once.
export class ImportWorkerHost {
    private readonly scope: ImportWorkerScope;
    private readonly checker: ImportChecker;

    constructor(scope: ImportWorkerScope, checker: ImportChecker) {
        this.scope = scope;
        this.checker = checker;
    }

    listen() {
        this.scope.onmessage = (event) => {
            this.scope.postMessage(this.answer(event.data));
        };
    }

    private answer(request: ImportRequest): ImportAnswer {
        try {
            return { kind: 'checked', outcome: this.checker.check(new Uint8Array(request.bytes)) };
        } catch (error) {
            return { kind: 'failed', detail: error instanceof Error ? error.message : String(error) };
        }
    }
}
