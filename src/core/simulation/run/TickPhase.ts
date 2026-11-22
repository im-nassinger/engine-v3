import type { PlayRun } from './PlayRun.ts';
import type { TickInputs } from '../inputs/TickInputs.ts';

// What a phase is given for one tick. The tick counts from 1 for the first tick run.
export type TickContext = {
    readonly tick: number;
    readonly inputs: TickInputs;
    readonly run: PlayRun;
};

// One part of a tick. The Simulation runs its phases in order, every tick.
export type TickPhase = {
    run(tick: TickContext): void;
};
