import type { ComponentTypeName } from '../../../core/components/index.ts';
import { VersionCounter } from '../../../core/events/index.ts';

import type { FoldStore } from './FoldStore.ts';
import { InMemoryFoldStore } from './InMemoryFoldStore.ts';

// Which cards are folded, one switch per component type, the same on every entity and every level.
// Folding is never an undo step.
export class CardFolds {
    readonly version = new VersionCounter();
    private readonly store: FoldStore;
    private readonly folded: Set<ComponentTypeName>;

    constructor(store: FoldStore = new InMemoryFoldStore()) {
        this.store = store;

        const loaded = store.loadFolded();
        this.folded = new Set(loaded);
    }

    isFolded(typeName: ComponentTypeName) {
        return this.folded.has(typeName);
    }

    setFolded(typeName: ComponentTypeName, isFolded: boolean) {
        if (this.isFolded(typeName) === isFolded) return;

        if (isFolded) {
            this.folded.add(typeName);
        } else {
            this.folded.delete(typeName);
        }

        const foldedTypes = [...this.folded];
        this.store.saveFolded(foldedTypes);
        this.version.increment();
    }
}
