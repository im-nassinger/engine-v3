import { describe, expect, test } from 'vitest';

import { LevelEditorData } from './LevelEditorData.ts';

describe('LevelEditorData', () => {
    test('starts with a 50 px grid and nothing folded', () => {
        const editorData = new LevelEditorData();

        expect(editorData.gridSize).toBe(50);
        expect(editorData.foldedRows()).toEqual([]);
    });

    test('keeps the grid size whole and between 5 and 1,000 px', () => {
        const editorData = new LevelEditorData();

        expect(editorData.setGridSize(32.4)).toBe(32);
        expect(editorData.setGridSize(2)).toBe(5);
        expect(editorData.setGridSize(5000)).toBe(1000);
        expect(editorData.gridSize).toBe(1000);
    });

    test('folds and unfolds rows, listing them lowest id first', () => {
        const editorData = new LevelEditorData();

        editorData.setFolded(40, true);
        editorData.setFolded(12, true);
        editorData.setFolded(7, true);
        editorData.setFolded(7, false);

        expect(editorData.isFolded(12)).toBe(true);
        expect(editorData.isFolded(7)).toBe(false);
        expect(editorData.foldedRows()).toEqual([12, 40]);
    });

    test('moves its version on only when something changes', () => {
        const editorData = new LevelEditorData();
        const before = editorData.version.version;

        editorData.setGridSize(50);
        editorData.setFolded(3, false);
        expect(editorData.version.version).toBe(before);

        editorData.setGridSize(60);
        editorData.setFolded(3, true);
        expect(editorData.version.version).toBe(before + 2);
    });
});
