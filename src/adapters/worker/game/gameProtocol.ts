import type { LevelData, ReadRefusal } from '../../../core/level-data/index.ts';
import type { TickInputs, TickReport } from '../../../core/simulation/index.ts';

// What the page sends the game worker. The worker handles them one at a time, in the order sent.
export type GameRequest =
    // Load Box2D now, when the editor opens, so the first Play is fast.
    | { readonly kind: 'prepare' }
    // Build a run from the level as the editor wrote it, dropping any run before it.
    | { readonly kind: 'start'; readonly levelData: LevelData; readonly clockTimeMs: number }
    // Build a new run from the level and clock time the last start kept, dropping the run before it.
    // Answered like a start.
    | { readonly kind: 'restart' }
    // Run one tick per entry, with what the player holds during it, and answer with one report.
    | { readonly kind: 'runTicks'; readonly inputsPerTick: readonly TickInputs[] }
    // Drop the run and the kept level, and keep Box2D loaded for the next start. Nothing answers.
    | { readonly kind: 'stop' };

// What the game worker answers. failed and crashed end the run; the page doesn't wait for the watchdog.
export type GameAnswer =
    | { readonly kind: 'ready' }
    | { readonly kind: 'started' }
    // The level data couldn't be read, with the reader's reason. The editor wrote it, so it is a bug.
    | { readonly kind: 'failed'; readonly reason: ReadRefusal }
    // Something threw while loading, starting or running a tick. The worker is replaced.
    | { readonly kind: 'crashed'; readonly detail: string }
    // A batch's report, its poses transferred, not copied.
    | { readonly kind: 'ticked'; readonly report: TickReport };
