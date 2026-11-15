import type { Level } from '../../../core/entities/index.ts';

// One edit that can apply and revert itself. Points at entities by id, never by object, because undo of a
// delete creates new Entity objects with the old ids.
export type LevelChange = {
    apply(level: Level): void;
    revert(level: Level): void;
};
