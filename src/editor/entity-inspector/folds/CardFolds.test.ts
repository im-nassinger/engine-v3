import { describe, expect, test } from 'vitest';

import { CardFolds } from './CardFolds.ts';
import { InMemoryFoldStore } from './InMemoryFoldStore.ts';

describe('CardFolds', () => {
    test('keeps one switch per component type and moves its version only on a change', () => {
        const folds = new CardFolds();

        folds.setFolded('BodyComponent', true);
        folds.setFolded('BodyComponent', true);

        expect(folds.isFolded('BodyComponent')).toBe(true);
        expect(folds.isFolded('SurfaceComponent')).toBe(false);
        expect(folds.version.version).toBe(1);
    });

    test('saves to its store and starts from what the store holds', () => {
        const store = new InMemoryFoldStore();
        const first = new CardFolds(store);
        first.setFolded('ShapeComponent', true);
        first.setFolded('StyleComponent', true);
        first.setFolded('ShapeComponent', false);

        const second = new CardFolds(store);

        expect(store.loadFolded()).toEqual(['StyleComponent']);
        expect(second.isFolded('StyleComponent')).toBe(true);
        expect(second.isFolded('ShapeComponent')).toBe(false);
    });
});
