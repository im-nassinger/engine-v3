import { describe, expect, test } from 'vitest';

import { Level } from '../../../core/level/index.ts';
import { EntitiesRows } from '../rows/EntitiesRows.ts';

import { EntitiesDrop } from './EntitiesDrop.ts';
import type { DropPointer } from './EntitiesDrop.ts';

// Rows, top first:
// 0 World (0), 1 group (1), 2 child (2), 3 grandchild (3), 4 square (1), 5 circle (1), 6 camera (1)
function buildLevel() {
    const level = Level.createNew();
    const circle = level.createEntity(level.world, 0);
    const square = level.createEntity(level.world, 0);
    const group = level.createEntity(level.world, 0);
    const child = level.createEntity(group, 0);
    const grandchild = level.createEntity(child, 0);
    const rows = new EntitiesRows(level);
    const drop = new EntitiesDrop(level, rows);

    return { level, group, child, grandchild, square, circle, rows, drop };
}

const TOP = 0.1;
const MIDDLE = 0.5;
const BOTTOM = 0.9;

function pointer(rowIndex: number, heightFraction: number, pointerDepth = 1): DropPointer {
    return { rowIndex, heightFraction, pointerDepth };
}

describe('EntitiesDrop', () => {
    test('the top third of a row lands above it, in its parent', () => {
        const { level, square, circle, drop } = buildLevel();

        const target = drop.targetAt([circle.id], pointer(4, TOP));

        expect(target).toEqual({ parentId: level.world.id, index: 1, lineBelowRowIndex: 3, lineDepth: 1 });
        expect(level.world.children.indexOf(square)).toBe(1);
    });

    test('the middle third lands into the row, at its top', () => {
        const { square, circle, drop } = buildLevel();

        const target = drop.targetAt([circle.id], pointer(4, MIDDLE));

        expect(target).toEqual({ parentId: square.id, index: 0, lineBelowRowIndex: 4, lineDepth: 2 });
    });

    test('into a folded group lands at its top and keeps it folded', () => {
        const { group, square, rows, drop } = buildLevel();
        rows.setFolded(group.id, true);

        const target = drop.targetAt([square.id], pointer(1, MIDDLE));

        expect(target).toEqual({ parentId: group.id, index: 0, lineBelowRowIndex: 1, lineDepth: 2 });
        expect(rows.rows[1]?.isFolded).toBe(true);
    });

    test('below a leaf lands just after it', () => {
        const { level, square, drop } = buildLevel();

        const target = drop.targetAt([square.id], pointer(5, BOTTOM));

        expect(target).toEqual({ parentId: level.world.id, index: 3, lineBelowRowIndex: 5, lineDepth: 1 });
    });

    test('below an unfolded group lands into it, at its top', () => {
        const { group, square, drop } = buildLevel();

        const target = drop.targetAt([square.id], pointer(1, BOTTOM));

        expect(target).toEqual({ parentId: group.id, index: 0, lineBelowRowIndex: 1, lineDepth: 2 });
    });

    test("after a group's last child the indent picks the depth", () => {
        const { level, group, child, grandchild, square, drop } = buildLevel();

        const deepest = drop.targetAt([square.id], pointer(3, BOTTOM, 3));
        const middle = drop.targetAt([square.id], pointer(3, BOTTOM, 2));
        const shallowest = drop.targetAt([square.id], pointer(3, BOTTOM, 1));

        expect(deepest).toEqual({ parentId: child.id, index: 1, lineBelowRowIndex: 3, lineDepth: 3 });
        expect(middle).toEqual({ parentId: group.id, index: 1, lineBelowRowIndex: 3, lineDepth: 2 });
        expect(shallowest).toEqual({ parentId: level.world.id, index: 1, lineBelowRowIndex: 3, lineDepth: 1 });
        expect(grandchild.parent).toBe(child);
    });

    test('the indent is kept between the next row and the row itself', () => {
        const { child, square, drop } = buildLevel();

        const tooDeep = drop.targetAt([square.id], pointer(3, BOTTOM, 9));
        const tooShallow = drop.targetAt([square.id], pointer(5, BOTTOM, 0));

        expect(tooDeep?.parentId).toBe(child.id);
        expect(tooShallow?.lineDepth).toBe(1);
    });

    test('below the last row the indent can go back up to the World', () => {
        const { level, square, circle, drop } = buildLevel();
        const nested = level.createEntity(level.camera, 0);

        const target = drop.targetAt([square.id], pointer(7, BOTTOM, 1));

        expect(target?.parentId).toBe(level.world.id);
        expect(target?.index).toBe(level.world.children.length);
        expect(nested.parent).toBe(level.camera);
        expect(circle.parent).toBe(level.world);
    });

    test('above the World is refused, into it and below it land at its top', () => {
        const { level, square, rows, drop } = buildLevel();

        const above = drop.targetAt([square.id], pointer(0, TOP));
        const into = drop.targetAt([square.id], pointer(0, MIDDLE));
        rows.setFolded(level.world.id, true);
        const belowFolded = drop.targetAt([square.id], pointer(0, BOTTOM));

        expect(above).toBeUndefined();
        expect(into).toEqual({ parentId: level.world.id, index: 0, lineBelowRowIndex: 0, lineDepth: 1 });
        expect(belowFolded).toEqual(into);
    });

    test('into a dragged row or its children is refused', () => {
        const { group, child, grandchild, square, drop } = buildLevel();

        expect(drop.targetAt([group.id], pointer(1, MIDDLE))).toBeUndefined();
        expect(drop.targetAt([square.id, group.id], pointer(2, MIDDLE))).toBeUndefined();
        expect(drop.targetAt([group.id], pointer(3, BOTTOM, 3))).toBeUndefined();
        expect(drop.targetAt([child.id], pointer(3, TOP))).toBeUndefined();
        expect(drop.targetAt([grandchild.id], pointer(3, TOP))?.parentId).toBe(child.id);
    });

    test('a dragged row may drop next to itself', () => {
        const { level, square, drop } = buildLevel();

        const target = drop.targetAt([square.id], pointer(4, TOP));

        expect(target?.parentId).toBe(level.world.id);
    });

    test('the camera drops only directly inside the World', () => {
        const { level, group, square, drop } = buildLevel();

        const beside = drop.targetAt([level.camera.id], pointer(4, TOP));
        const intoSquare = drop.targetAt([level.camera.id], pointer(4, MIDDLE));
        const intoGroup = drop.targetAt([square.id, level.camera.id], pointer(2, TOP));

        expect(beside?.parentId).toBe(level.world.id);
        expect(intoSquare).toBeUndefined();
        expect(intoGroup).toBeUndefined();
        expect(group.children).toHaveLength(1);
    });

    test('the World can never be dragged, and a row past the end gives no target', () => {
        const { level, square, drop } = buildLevel();

        expect(drop.targetAt([level.world.id], pointer(4, TOP))).toBeUndefined();
        expect(drop.targetAt([square.id], pointer(99, TOP))).toBeUndefined();
    });
});
