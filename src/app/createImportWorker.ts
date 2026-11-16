// Starts the import worker. Vite finds the worker file from this exact form and builds it on its own.
export function createImportWorker() {
    return new Worker(new URL('./workers/import.worker.ts', import.meta.url), { type: 'module' });
}
