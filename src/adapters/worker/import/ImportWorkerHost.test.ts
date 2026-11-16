import { describe, expect, test } from 'vitest';

import type { LevelData, ReadOutcome } from '../../../core/level-data/index.ts';

import { ImportWorkerHost } from './ImportWorkerHost.ts';
import type { ImportWorkerScope } from './ImportWorkerHost.ts';
import type { ImportAnswer, ImportRequest } from './importProtocol.ts';

class FakeScope implements ImportWorkerScope {
    onmessage: ((event: MessageEvent<ImportRequest>) => void) | null = null;
    readonly answers: ImportAnswer[] = [];

    postMessage(answer: ImportAnswer) {
        this.answers.push(answer);
    }

    send(bytes: ArrayBuffer) {
        this.onmessage?.(new MessageEvent('message', { data: { bytes } }));
    }
}

const NOT_A_LEVEL: ReadOutcome<LevelData> = { ok: false, refusal: { reason: 'notALevel' } };

describe('ImportWorkerHost', () => {
    test('answers each file with the check of its bytes', () => {
        const scope = new FakeScope();
        const seen: number[][] = [];
        new ImportWorkerHost(scope, {
            check: (bytes) => {
                seen.push([...bytes]);
                return NOT_A_LEVEL;
            },
        }).listen();

        scope.send(new Uint8Array([1, 2, 3]).buffer);

        expect(seen).toEqual([[1, 2, 3]]);
        expect(scope.answers).toEqual([{ kind: 'checked', outcome: NOT_A_LEVEL }]);
    });

    test('a check that throws is answered as failed with its message', () => {
        const scope = new FakeScope();
        new ImportWorkerHost(scope, {
            check: () => {
                throw new Error('out of memory');
            },
        }).listen();

        scope.send(new ArrayBuffer(0));

        expect(scope.answers).toEqual([{ kind: 'failed', detail: 'out of memory' }]);
    });
});
