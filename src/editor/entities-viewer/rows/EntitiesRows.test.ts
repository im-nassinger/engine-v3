import { describe, expect, test } from 'vitest';

import { Level } from '../../../core/level/index.ts';

import { EntitiesRows } from './EntitiesRows.ts';

// World, then the camera and the new entities on top, newest first:
// World > group > (child > grandchild), square, camera
function buildLevel() {
    const level = Level.createNew();
    const square = level.createEntity(level.world, 0);
    const group = level.createEntity(level.world, 0);
    const child = level.createEntity(group, 0);
    const grandchild = level.createEntity(child, 0);
    const rows = new EntitiesRows(level);

    return { level, group, child, grandchild, square, rows };
}

function rowIds(rows: EntitiesRows) {
    return rows.rows.map((row) => row.entityId);
}

describe('EntitiesRows', () => {
    test('lists every entity in panel order, with its depth', () => {
        const { level, rows } = buildLevel();

        const panelOrder = [...level.entitiesInPanelOrder()].map((entity) => entity.id);
        const depths = rows.rows.map((row) => row.depth);

        expect(rowIds(rows)).toEqual(panelOrder);
        expect(depths[0]).toBe(0);
        expect(depths).toEqual([...level.entitiesInPanelOrder()].map((entity) => entity.depth));
    });

    test('folding hides a subtree and unfolding brings it back', () => {
        const { group, child, grandchild, rows } = buildLevel();
        const allRows = rowIds(rows);

        rows.setFolded(group.id, true);

        expect(rowIds(rows)).not.toContain(child.id);
        expect(rowIds(rows)).not.toContain(grandchild.id);
        expect(rows.rows[rows.indexOf(group.id)]?.isFolded).toBe(true);
        expect(rows.indexOf(child.id)).toBe(-1);

        rows.setFolded(group.id, false);

        expect(rowIds(rows)).toEqual(allRows);
    });

    test('a row with no children has no fold', () => {
        const { level, square, rows } = buildLevel();

        rows.setFolded(square.id, true);

        const squareRow = rows.rows[rows.indexOf(square.id)];
        expect(squareRow?.hasChildren).toBe(false);
        expect(squareRow?.isFolded).toBe(false);
        expect(level.editorData.isFolded(square.id)).toBe(false);
    });

    test('folding is kept in the level editor data, which a new EntitiesRows reads', () => {
        const { level, group, child, rows } = buildLevel();

        rows.setFolded(group.id, true);
        const rowsOfTheSameLevel = new EntitiesRows(level);

        expect(level.editorData.foldedRows()).toEqual([group.id]);
        expect(rowsOfTheSameLevel.indexOf(child.id)).toBe(-1);
    });

    test('reveal unfolds every parent and gives the row index', () => {
        const { group, child, grandchild, rows } = buildLevel();
        rows.setFolded(child.id, true);
        rows.setFolded(group.id, true);

        const index = rows.reveal(grandchild.id);

        expect(index).toBe(rows.indexOf(grandchild.id));
        expect(rows.rows[index]?.entityId).toBe(grandchild.id);
        expect(rows.rows[rows.indexOf(group.id)]?.isFolded).toBe(false);
        expect(rows.rows[rows.indexOf(child.id)]?.isFolded).toBe(false);
    });

    test('a child hidden by its parent is marked, the parent itself is not', () => {
        const { group, child, grandchild, square, rows } = buildLevel();

        group.setHidden(true);

        const rowOf = (id: number) => rows.rows[rows.indexOf(id)];
        expect(rowOf(group.id)?.hiddenByParent).toBe(false);
        expect(rowOf(child.id)?.hiddenByParent).toBe(true);
        expect(rowOf(grandchild.id)?.hiddenByParent).toBe(true);
        expect(rowOf(square.id)?.hiddenByParent).toBe(false);

        group.setHidden(false);

        expect(rowOf(child.id)?.hiddenByParent).toBe(false);
    });

    test('adding, removing and moving entities rebuild the rows', () => {
        const { level, group, square, rows } = buildLevel();
        const versionBefore = rows.version.version;

        const added = level.createEntity(group, 0);
        expect(rowIds(rows)).toContain(added.id);

        level.moveEntity(square, group, 0);
        expect(rows.rows[rows.indexOf(square.id)]?.depth).toBe(2);

        level.removeEntity(group);
        expect(rowIds(rows)).not.toContain(square.id);
        expect(rows.indexOf(group.id)).toBe(-1);
        expect(rows.version.version).toBeGreaterThan(versionBefore);
    });

    test('reading the rows of a 10,000-entity level twice walks the tree once', () => {
        const level = Level.createNew();
        for (let i = 0; i < 10_000; i += 1) {
            level.createEntity(level.world, 0);
        }
        const rows = new EntitiesRows(level);

        const firstRead = rows.rows;
        const secondRead = rows.rows;
        const lastId = firstRead[firstRead.length - 1]?.entityId ?? -1;
        const lastIndex = rows.indexOf(lastId);

        expect(firstRead).toHaveLength(10_002);
        expect(secondRead).toBe(firstRead);
        expect(rows.rows).toBe(firstRead);
        expect(lastIndex).toBe(10_001);
    });

    test('a value change or a leaf eye keeps the rows as they are', () => {
        const { square, rows } = buildLevel();
        const firstRead = rows.rows;
        const versionBefore = rows.version.version;

        square.setHidden(true);

        expect(rows.rows).toBe(firstRead);
        expect(rows.version.version).toBe(versionBefore);
    });

    test('stops following the level once disposed', () => {
        const { level, rows } = buildLevel();
        const versionBefore = rows.version.version;

        rows.dispose();
        level.createEntity(level.world, 0);

        expect(rows.version.version).toBe(versionBefore);
    });
});
