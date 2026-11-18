import { describe, expect, test } from 'vitest';

import { Level } from '../../../core/level/index.ts';
import { Selection } from '../../selection/index.ts';
import { SelectionReveal } from '../reveal/SelectionReveal.ts';
import { EntitiesRows } from '../rows/EntitiesRows.ts';

import { RowClicks } from './RowClicks.ts';

// Rows, top first: World, group, child, square, circle, camera.
function buildLevel() {
    const level = Level.createNew();
    const circle = level.createEntity(level.world, 0);
    const square = level.createEntity(level.world, 0);
    const group = level.createEntity(level.world, 0);
    const child = level.createEntity(group, 0);
    const selection = new Selection(level);
    const rows = new EntitiesRows(level);
    const reveal = new SelectionReveal(selection, rows);
    const clicks = new RowClicks(selection, rows, reveal);

    return { level, group, child, square, circle, selection, rows, reveal, clicks };
}

describe('RowClicks', () => {
    test('a click selects only its row', () => {
        const { square, circle, selection, clicks } = buildLevel();

        clicks.click(square.id, 'click');
        clicks.click(circle.id, 'click');

        expect(selection.ids).toEqual([circle.id]);
    });

    test('Ctrl+click adds a row and removes it again', () => {
        const { square, circle, selection, clicks } = buildLevel();

        clicks.click(square.id, 'click');
        clicks.click(circle.id, 'ctrlClick');
        expect(selection.ids).toEqual([square.id, circle.id]);

        clicks.click(square.id, 'ctrlClick');
        expect(selection.ids).toEqual([circle.id]);
    });

    test('Ctrl+click on the World selects it alone', () => {
        const { level, square, selection, clicks } = buildLevel();

        clicks.click(square.id, 'click');
        clicks.click(level.world.id, 'ctrlClick');

        expect(selection.ids).toEqual([level.world.id]);
    });

    test('Shift+click selects the rows between the anchor and the click in row order', () => {
        const { group, child, square, circle, selection, clicks } = buildLevel();

        clicks.click(circle.id, 'click');
        clicks.click(child.id, 'shiftClick');
        expect(new Set(selection.ids)).toEqual(new Set([child.id, square.id, circle.id]));

        clicks.click(group.id, 'shiftClick');
        expect(new Set(selection.ids)).toEqual(new Set([group.id, square.id, circle.id]));
    });

    test('Shift+click replaces the selection and keeps the anchor', () => {
        const { level, square, circle, selection, clicks } = buildLevel();

        clicks.click(square.id, 'click');
        clicks.click(level.camera.id, 'shiftClick');
        clicks.click(circle.id, 'shiftClick');

        expect(selection.ids).toEqual([square.id, circle.id]);
    });

    test('Ctrl+click moves the anchor', () => {
        const { square, circle, selection, clicks, level } = buildLevel();

        clicks.click(square.id, 'click');
        clicks.click(circle.id, 'ctrlClick');
        clicks.click(level.camera.id, 'shiftClick');

        expect(selection.ids).toEqual([circle.id, level.camera.id]);
    });

    test('Shift+click with no anchor acts as a click and sets the anchor', () => {
        const { square, circle, selection, clicks } = buildLevel();

        clicks.click(square.id, 'shiftClick');
        expect(selection.ids).toEqual([square.id]);

        clicks.click(circle.id, 'shiftClick');
        expect(selection.ids).toEqual([square.id, circle.id]);
    });

    test('Shift+click acts as a click when the anchor is folded away or removed', () => {
        const { level, group, child, square, circle, selection, rows, clicks } = buildLevel();

        clicks.click(child.id, 'click');
        rows.setFolded(group.id, true);
        clicks.click(circle.id, 'shiftClick');
        expect(selection.ids).toEqual([circle.id]);

        level.removeEntity(circle);
        clicks.click(square.id, 'shiftClick');
        expect(selection.ids).toEqual([square.id]);
    });

    test('a click reveals nothing, even on a row inside a folded group', () => {
        const { level, group, child, reveal, clicks } = buildLevel();
        level.editorData.setFolded(group.id, true);
        let asks = 0;
        reveal.version.subscribe(() => (asks += 1));

        clicks.click(child.id, 'click');

        expect(level.editorData.isFolded(group.id)).toBe(true);
        expect(reveal.entityId).toBeUndefined();
        expect(asks).toBe(0);
    });
});
