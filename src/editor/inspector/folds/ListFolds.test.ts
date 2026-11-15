import { describe, expect, test } from 'vitest';

import { ListFolds } from './ListFolds.ts';

describe('ListFolds', () => {
    test('a list starts folded, and unfolding is kept per component type and key', () => {
        const folds = new ListFolds();
        expect(folds.isFolded('ShapeComponent', 'points')).toBe(true);

        folds.setFolded('ShapeComponent', 'points', false);
        folds.setFolded('ShapeComponent', 'points', false);

        expect(folds.isFolded('ShapeComponent', 'points')).toBe(false);
        expect(folds.isFolded('PathComponent', 'points')).toBe(true);
        expect(folds.version.version).toBe(1);
    });
});
