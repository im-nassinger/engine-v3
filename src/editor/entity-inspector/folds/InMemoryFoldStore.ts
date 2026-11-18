import type { ComponentTypeName } from '../../../core/components/index.ts';

import type { FoldStore } from './FoldStore.ts';

export class InMemoryFoldStore implements FoldStore {
    private folded: readonly ComponentTypeName[] = [];

    loadFolded() {
        return this.folded;
    }

    saveFolded(folded: readonly ComponentTypeName[]) {
        this.folded = [...folded];
    }
}
