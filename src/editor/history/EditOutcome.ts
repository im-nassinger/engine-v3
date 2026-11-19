import type { EntityId } from '../../core/level/index.ts';

// An entity a command left out because it doesn't allow the command: "Camera kept" in the message pill.
export type SkippedEntity = {
    readonly id: EntityId;
    readonly kind: 'world' | 'camera';
};

// A refusal's reason is already the message pill's sentence, written by the command next to its rule.
export type EditOutcome =
    | { readonly kind: 'done'; readonly selectAfter?: readonly EntityId[]; readonly skipped?: readonly SkippedEntity[] }
    | { readonly kind: 'refused'; readonly reason: string };
