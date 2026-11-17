import type { LevelData, ReadRefusal } from '../../../core/level-data/index.ts';
import type { RunStart, TickInputs, TickReport } from '../../../core/simulation/index.ts';

// Something threw in the game while it loaded, started or ran a tick. The run is over.
export type GameCrash = { readonly kind: 'crashed'; readonly detail: string };

export type StartOutcome =
    | { readonly kind: 'started' }
    // The level data couldn't be read, with the reader's reason. The editor wrote it, so it is a bug.
    | { readonly kind: 'failed'; readonly reason: ReadRefusal }
    | GameCrash;

export type TicksOutcome = { readonly kind: 'ticked'; readonly report: TickReport } | GameCrash;

// Runs the game away from the editor: WorkerGameRunner in the game worker, DirectGameRunner in the same thread
// for tests. One run at a time; a start drops any run before it.
export type GameRunner = {
    // Loads the game now, so the first Play is fast. Called when the editor opens.
    prepare(): void;
    // Builds a run from the level as the editor wrote it. Waits for the game to load if it hasn't yet.
    start(levelData: LevelData, start: RunStart): Promise<StartOutcome>;
    // Runs one tick per entry, with what the player holds during it, and answers with one report.
    runTicks(inputsPerTick: readonly TickInputs[]): Promise<TicksOutcome>;
    // Drops the run and keeps the game loaded. A batch sent before it is still answered.
    stop(): void;
    // Ends a game that stopped answering, and prepares a fresh one for the next start. Nothing asked before it
    // is ever answered.
    terminate(): void;
};
