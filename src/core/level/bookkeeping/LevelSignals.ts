import { Signal, VersionCounter } from '../../events/index.ts';

import { EntityVersions } from './EntityVersions.ts';
import type { LevelUpdate } from '../LevelUpdate.ts';

// Signals are synchronous. A listener must not change the level while handling one.
export class LevelSignals {
    readonly updated = new Signal<LevelUpdate>();
    // Any add, remove or move.
    readonly treeVersion = new VersionCounter();
    readonly entityVersions = new EntityVersions();
    // Only the level's own name: the top bar and the browser tab title read it.
    readonly nameVersion = new VersionCounter();
    // Anything at all: used by autosave.
    readonly levelVersion = new VersionCounter();
}
