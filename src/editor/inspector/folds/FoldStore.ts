import type { ComponentTypeName } from '../../../core/components/index.ts';

// Where the folded cards are kept between openings of the editor. EditorSettings keeps
// them in the browser; InMemoryFoldStore keeps them for one page load, for tests.
export type FoldStore = {
    loadFolded(): readonly ComponentTypeName[];
    saveFolded(folded: readonly ComponentTypeName[]): void;
};
