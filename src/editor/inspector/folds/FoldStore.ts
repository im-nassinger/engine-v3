import type { ComponentTypeName } from '../../../core/components/index.ts';

// Where the folded cards are kept between openings of the editor. Stage 12's LocalStorageSettings keeps
// them in the browser; until then InMemoryFoldStore keeps them for one page load.
export type FoldStore = {
    loadFolded(): readonly ComponentTypeName[];
    saveFolded(folded: readonly ComponentTypeName[]): void;
};
