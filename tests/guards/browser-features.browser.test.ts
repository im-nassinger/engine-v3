import { describe, expect, test } from 'vitest';

// The smallest valid WebAssembly module: the magic number and version 1.
const EMPTY_WASM_MODULE = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);

function openDatabase(name: string) {
    return new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(name, 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB refused to open.'));
    });
}

function echoThroughWorker(message: string) {
    const workerSource = 'self.onmessage = event => self.postMessage(event.data);';
    const workerBlob = new Blob([workerSource], { type: 'text/javascript' });
    const workerUrl = URL.createObjectURL(workerBlob);
    const worker = new Worker(workerUrl);

    return new Promise<unknown>((resolve, reject) => {
        worker.onmessage = (event) => {
            worker.terminate();
            URL.revokeObjectURL(workerUrl);
            resolve(event.data);
        };
        worker.onerror = (event) => reject(new Error(event.message));
        worker.postMessage(message);
    });
}

describe('the browser has what v1 uses', () => {
    test('IndexedDB opens a database', async () => {
        const database = await openDatabase('browser-features');

        expect(database.name).toBe('browser-features');

        database.close();
    });

    test('Web Locks grant a lock', async () => {
        const lockName = await navigator.locks.request('browser-features', (lock) => lock?.name);

        expect(lockName).toBe('browser-features');
    });

    test('a worker answers a message', async () => {
        const answer = await echoThroughWorker('hello');

        expect(answer).toBe('hello');
    });

    test('WebAssembly compiles a module', async () => {
        const compiledModule = await WebAssembly.compile(EMPTY_WASM_MODULE);

        expect(compiledModule).toBeInstanceOf(WebAssembly.Module);
    });
});
