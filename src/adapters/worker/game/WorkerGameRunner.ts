import type { LevelData } from '../../../core/level-data/index.ts';
import type { RunStart, TickInputs } from '../../../core/simulation/index.ts';
import type { GameCrash, GameRunner, StartOutcome, TicksOutcome } from '../../../editor/play/index.ts';

import type { GameAnswer, GameRequest } from './gameProtocol.ts';

type Waiter =
    | { readonly kind: 'start'; readonly answer: (outcome: StartOutcome) => void }
    | { readonly kind: 'ticks'; readonly answer: (outcome: TicksOutcome) => void };

// The page's side of the game worker. One worker is prepared when the editor opens and kept between runs; a
// crash or terminate() replaces it. The worker answers in the order asked, so each answer goes to the oldest
// request still waiting.
export class WorkerGameRunner implements GameRunner {
    private readonly createWorker: () => Worker;
    private worker: Worker | undefined;
    private waiters: Waiter[] = [];
    private running = false;

    constructor(createWorker: () => Worker) {
        this.createWorker = createWorker;
    }

    prepare() {
        this.workerNow();
    }

    start(levelData: LevelData, start: RunStart): Promise<StartOutcome> {
        return this.askToStart({ kind: 'start', levelData, clockTimeMs: start.clockTimeMs });
    }

    restart(): Promise<StartOutcome> {
        if (this.worker === undefined) throw new Error('Restart was asked with no game.');

        return this.askToStart({ kind: 'restart' });
    }

    runTicks(inputsPerTick: readonly TickInputs[]): Promise<TicksOutcome> {
        const worker = this.worker;
        if (worker === undefined || !this.running) throw new Error('A batch was sent with no run.');

        return new Promise<TicksOutcome>((answer) => {
            this.waiters.push({ kind: 'ticks', answer });
            send(worker, { kind: 'runTicks', inputsPerTick });
        });
    }

    stop() {
        this.running = false;
        if (this.worker !== undefined) {
            send(this.worker, { kind: 'stop' });
        }
    }

    terminate() {
        this.endWorker();
        this.workerNow();
    }

    private askToStart(request: GameRequest & { readonly kind: 'start' | 'restart' }) {
        const worker = this.workerNow();
        this.running = false;

        return new Promise<StartOutcome>((answer) => {
            this.waiters.push({ kind: 'start', answer });
            send(worker, request);
        });
    }

    // The worker, created and told to load the game if there is none.
    private workerNow() {
        if (this.worker !== undefined) return this.worker;

        const worker = this.createWorker();
        worker.onmessage = (event: MessageEvent<GameAnswer>) => {
            this.receive(event.data);
        };
        worker.onerror = (event) => {
            event.preventDefault();
            this.crashed({ kind: 'crashed', detail: event.message });
        };
        worker.onmessageerror = () => {
            this.crashed({ kind: 'crashed', detail: 'The game worker answered with data that could not be read.' });
        };
        this.worker = worker;
        send(worker, { kind: 'prepare' });

        return worker;
    }

    private receive(answer: GameAnswer) {
        switch (answer.kind) {
            case 'ready':
                return;
            case 'crashed':
                this.crashed(answer);
                return;
            case 'started':
            case 'failed':
                this.answerStart(answer);
                return;
            case 'ticked':
                this.answerTicks(answer);
                return;
        }
    }

    private answerStart(outcome: StartOutcome) {
        const waiter = this.waiters.shift();
        if (waiter?.kind !== 'start') throw new Error(`The game worker answered ${outcome.kind} to no start.`);

        this.running = outcome.kind === 'started';
        waiter.answer(outcome);
    }

    private answerTicks(outcome: TicksOutcome) {
        const waiter = this.waiters.shift();
        if (waiter?.kind !== 'ticks') throw new Error('The game worker answered a batch that was never sent.');

        waiter.answer(outcome);
    }

    // Everything waiting is answered with the crash, and the worker is replaced. A fresh one is prepared at
    // once only when the crash ended a run; a crash while only loading waits for the next start, so a game
    // that can never load isn't reloaded forever.
    private crashed(crash: GameCrash) {
        const waiters = this.waiters;
        this.endWorker();
        for (const waiter of waiters) {
            waiter.answer(crash);
        }
        if (waiters.length > 0) {
            this.workerNow();
        }
    }

    // Nothing waiting is ever answered.
    private endWorker() {
        this.worker?.terminate();
        this.worker = undefined;
        this.waiters = [];
        this.running = false;
    }
}

function send(worker: Worker, request: GameRequest) {
    worker.postMessage(request);
}
