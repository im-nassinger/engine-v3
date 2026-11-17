import type { GameAnswer, GameRequest } from '../../../adapters/worker/index.ts';

// A game worker for the watchdog's test: it loads and starts at once, as the real one does, and never
// answers a batch, as a game stuck in a tick wouldn't. v1's real game can't be made to hang.
const scope = self as unknown as {
    onmessage: ((event: MessageEvent<GameRequest>) => void) | null;
    postMessage(answer: GameAnswer): void;
};

scope.onmessage = (event) => {
    const request = event.data;
    if (request.kind === 'prepare') {
        scope.postMessage({ kind: 'ready' });
    }
    if (request.kind === 'start') {
        scope.postMessage({ kind: 'started' });
    }
};
