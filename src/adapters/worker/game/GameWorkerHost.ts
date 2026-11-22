import type { LevelData } from '../../../core/level-data/index.ts';
import type { PhysicsEngine } from '../../../core/physics/index.ts';
import { startSimulation } from '../../../core/simulation/index.ts';
import type { RunStart, Simulation, TickInputs } from '../../../core/simulation/index.ts';

import type { GameAnswer, GameRequest } from './gameProtocol.ts';

// The part of the worker's global scope the host uses, so a test can pass a fake.
export type GameWorkerScope = {
    onmessage: ((event: MessageEvent<GameRequest>) => void) | null;
    postMessage(answer: GameAnswer, transfer: Transferable[]): void;
};

// The game worker's side: loads the engine, builds a run with startSimulation and runs its ticks. Requests
// are handled strictly in order, even while Box2D is still loading.
export class GameWorkerHost {
    private readonly scope: GameWorkerScope;
    private readonly engine: PhysicsEngine;
    private queue: Promise<void> = Promise.resolve();
    private simulation: Simulation | undefined;
    // What the last start was given, kept until a stop, so Restart needs nothing from the page.
    private kept: { readonly levelData: LevelData; readonly start: RunStart } | undefined;

    constructor(scope: GameWorkerScope, engine: PhysicsEngine) {
        this.scope = scope;
        this.engine = engine;
    }

    listen() {
        this.scope.onmessage = (event) => {
            const request = event.data;
            this.queue = this.queue.then(() => this.handle(request));
        };
    }

    private async handle(request: GameRequest) {
        try {
            await this.handleOrThrow(request);
        } catch (error) {
            this.kept = undefined;
            this.dropRun();
            this.answer({ kind: 'crashed', detail: error instanceof Error ? error.message : String(error) });
        }
    }

    private async handleOrThrow(request: GameRequest) {
        switch (request.kind) {
            case 'prepare':
                await this.engine.load();
                this.answer({ kind: 'ready' });
                return;
            case 'start':
                this.kept = { levelData: request.levelData, start: { clockTimeMs: request.clockTimeMs } };
                await this.start(this.kept.levelData, this.kept.start);
                return;
            case 'restart': {
                const kept = this.kept;
                if (kept === undefined) throw new Error('Restart was asked with no level kept.');

                await this.start(kept.levelData, kept.start);
                return;
            }
            case 'runTicks':
                this.runTicks(request.inputsPerTick);
                return;
            case 'stop':
                this.kept = undefined;
                this.dropRun();
                return;
        }
    }

    private async start(levelData: LevelData, start: RunStart) {
        this.dropRun();
        await this.engine.load();
        const started = startSimulation(levelData, this.engine, start);
        if (!started.ok) {
            this.answer({ kind: 'failed', reason: started.refusal });
            return;
        }

        this.simulation = started.value;
        this.answer({ kind: 'started' });
    }

    // A batch with no run is one sent before a stop the page already made, so it is dropped.
    private runTicks(inputsPerTick: readonly TickInputs[]) {
        const simulation = this.simulation;
        if (simulation === undefined) return;

        for (const inputs of inputsPerTick) {
            simulation.runTick(inputs);
        }
        const report = simulation.takeReport();
        this.scope.postMessage({ kind: 'ticked', report }, [report.poses.buffer]);
    }

    private dropRun() {
        const simulation = this.simulation;
        this.simulation = undefined;
        simulation?.destroy();
    }

    private answer(answer: GameAnswer) {
        this.scope.postMessage(answer, []);
    }
}
