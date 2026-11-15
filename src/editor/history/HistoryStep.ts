import type { EntityId } from '../../core/entities/index.ts';

import type { LevelChange } from './changes/index.ts';

// What a step needs from its maker. History stamps the time it was recorded.
export type NewHistoryStep = {
    readonly label: string;
    readonly changes: readonly LevelChange[];
    readonly selectionBefore: readonly EntityId[];
    readonly selectionAfter: readonly EntityId[];
    readonly groupPathBefore: readonly EntityId[];
    readonly groupPathAfter: readonly EntityId[];
    readonly joinKey: string | undefined;
};

export type HistoryStep = NewHistoryStep & {
    readonly recordedAtMs: number;
};
