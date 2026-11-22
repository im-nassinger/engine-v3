import type { LevelData } from '../../../core/level-data/index.ts';
import type { PhysicsEngine } from '../../../core/physics/index.ts';
import { startSimulation } from '../../../core/simulation/index.ts';
import type { RunStart, Simulation, TickInputs } from '../../../core/simulation/index.ts';

import type { GameCrash, GameRunner, StartOutcome, TicksOutcome } from '../runner/GameRunner.ts';

const STALE = Symbol('stale');
const NEVER_ANSWERED = new Promise<never>(() => {});

function crash(error: unknown): GameCrash {
    return { kind: 'crashed', detail: error instanceof Error ? error.message : String(error) };
}

// A GameRunner that runs the game in the same thread, for tests. It does what GameWorkerHost does in the
// worker, with the same core calls, and answers in the order asked, never at once, as a worker would.
export class DirectGameRunner implements GameRunner {
    private readonly engine: PhysicsEngine;
    private queue: Promise<unknown> = Promise.resolve();
    private currentSimulation: Simulation | undefined;
    // What the last start was given, kept until a stop, as the game worker keeps it.
    private kept: { readonly levelData: LevelData; readonly start: RunStart } | undefined;
    // Raised by terminate, so nothing asked before it is answered.
    private generation = 0;
    private prepareCount = 0;
    private terminateCount = 0;

    constructor(engine: PhysicsEngine) {
        this.engine = engine;
    }

    // How many times prepare was called, and how many times the game was ended, for tests to check.
    get prepares() {
        return this.prepareCount;
    }

    get terminations() {
        return this.terminateCount;
    }

    // The run going now, so a test can compare the page's mirror with the play copy.
    get simulation() {
        return this.currentSimulation;
    }

    prepare() {
        this.prepareCount += 1;
        void this.enqueue(() => this.engine.load());
    }

    start(levelData: LevelData, start: RunStart): Promise<StartOutcome> {
        return this.enqueue(() => {
            this.kept = { levelData, start };
            return this.startKept();
        });
    }

    restart(): Promise<StartOutcome> {
        return this.enqueue(() => this.startKept());
    }

    runTicks(inputsPerTick: readonly TickInputs[]): Promise<TicksOutcome> {
        return this.enqueue(() => {
            const simulation = this.currentSimulation;
            if (simulation === undefined) throw new Error('A batch was sent with no run.');

            for (const inputs of inputsPerTick) {
                simulation.runTick(inputs);
            }

            return { kind: 'ticked', report: simulation.takeReport() };
        });
    }

    stop() {
        void this.enqueue(() => {
            this.kept = undefined;
            this.dropRun();
        });
    }

    terminate() {
        this.generation += 1;
        this.terminateCount += 1;
        this.dropRun();
        this.prepare();
    }

    // A run built from what the last start was given, dropping the one before it.
    private async startKept(): Promise<StartOutcome> {
        const kept = this.kept;
        if (kept === undefined) throw new Error('Restart was asked with no level kept.');

        this.dropRun();
        await this.engine.load();
        const started = startSimulation(kept.levelData, this.engine, kept.start);
        if (!started.ok) return { kind: 'failed', reason: started.refusal };

        this.currentSimulation = started.value;

        return { kind: 'started' };
    }

    // Runs the work after everything asked before it. A throw answers crashed and drops the run. Work asked
    // before a terminate never runs, and its answer never comes.
    private enqueue<T>(work: () => T | Promise<T>): Promise<T | GameCrash> {
        const generation = this.generation;
        const answered = this.queue.then(async () => {
            if (generation !== this.generation) return STALE;

            try {
                return await work();
            } catch (error) {
                this.dropRun();
                return crash(error);
            }
        });
        this.queue = answered;

        return answered.then((answer) => {
            if (answer === STALE || generation !== this.generation) return NEVER_ANSWERED;

            return answer;
        });
    }

    private dropRun() {
        const simulation = this.currentSimulation;
        this.currentSimulation = undefined;
        simulation?.destroy();
    }
}
