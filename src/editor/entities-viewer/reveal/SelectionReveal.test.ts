import { describe, expect, test } from 'vitest';

import { Level } from '../../../core/level/index.ts';
import { Selection } from '../../selection/index.ts';
import { EntitiesRows } from '../rows/EntitiesRows.ts';

import { SelectionReveal } from './SelectionReveal.ts';

// World > outer (folded) > inner (folded) > deep, and a square beside outer.
function buildLevel() {
    const level = Level.createNew();
    const square = level.createEntity(level.world, 0);
    const outer = level.createEntity(level.world, 0);
    const inner = level.createEntity(outer, 0);
    const deep = level.createEntity(inner, 0);
    level.editorData.setFolded(outer.id, true);
    level.editorData.setFolded(inner.id, true);

    const selection = new Selection(level);
    const rows = new EntitiesRows(level);
    const reveal = new SelectionReveal(selection, rows);

    return { level, square, outer, inner, deep, selection, rows, reveal };
}

describe('SelectionReveal', () => {
    test('a selection made outside the panel unfolds its parents and asks for its row', () => {
        const { level, outer, inner, deep, selection, rows, reveal } = buildLevel();
        expect(rows.indexOf(deep.id)).toBe(-1);

        selection.replace([deep.id]);

        expect(level.editorData.isFolded(outer.id)).toBe(false);
        expect(level.editorData.isFolded(inner.id)).toBe(false);
        expect(rows.indexOf(deep.id)).toBeGreaterThan(0);
        expect(reveal.entityId).toBe(deep.id);
    });

    test('every selected entity is shown, and the newest is the row asked for', () => {
        const { level, square, outer, deep, selection, reveal } = buildLevel();

        selection.replace([deep.id]);
        level.editorData.setFolded(outer.id, true);
        selection.add([square.id]);

        expect(level.editorData.isFolded(outer.id)).toBe(false);
        expect(reveal.entityId).toBe(square.id);
    });

    test('a selection made by the panel reveals nothing', () => {
        const { level, outer, deep, selection, reveal } = buildLevel();
        let asks = 0;
        reveal.version.subscribe(() => (asks += 1));

        const result = reveal.fromPanel(() => {
            selection.replace([deep.id]);
            return 'selected';
        });

        expect(result).toBe('selected');
        expect(level.editorData.isFolded(outer.id)).toBe(true);
        expect(reveal.entityId).toBeUndefined();
        expect(asks).toBe(0);

        selection.replace([outer.id]);
        expect(reveal.entityId).toBe(outer.id);
    });

    test('an empty selection asks for nothing, and clearing moves the version once', () => {
        const { square, selection, reveal } = buildLevel();
        selection.replace([square.id]);
        let asks = 0;
        reveal.version.subscribe(() => (asks += 1));

        reveal.clear();
        reveal.clear();
        selection.clear();

        expect(reveal.entityId).toBeUndefined();
        expect(asks).toBe(1);
    });

    test('after dispose, selecting reveals nothing', () => {
        const { level, outer, deep, selection, reveal } = buildLevel();

        reveal.dispose();
        selection.replace([deep.id]);

        expect(level.editorData.isFolded(outer.id)).toBe(true);
        expect(reveal.entityId).toBeUndefined();
    });
});
