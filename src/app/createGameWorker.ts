// Starts the game worker. Vite finds the worker file from this exact form and builds it on its own.
export function createGameWorker() {
    return new Worker(new URL('./workers/game.worker.ts', import.meta.url), { type: 'module' });
}
