import { describe, expect, test } from 'vitest';
import { labelName } from '../../../core/level/index.ts';
import type { Level } from '../../../core/level/index.ts';

import { EntityPickerRows } from './EntityPickerRows.ts';
import { buildPickerLevel } from './testing/buildPickerLevel.ts';

function namesOf(level: Level, rows: ReturnType<typeof EntityPickerRows.build>) {
    return rows.map((row) => `${'  '.repeat(row.depth)}${labelName(level.requireEntity(row.entityId))}`);
}

describe('EntityPickerRows', () => {
    test("lays out the Entities viewer's tree from the World, folded as the panel is", () => {
        const { level, house } = buildPickerLevel();
        level.editorData.setFolded(house.id, true);

        const rows = EntityPickerRows.build(level, new Map(), '');

        expect(namesOf(level, rows)).toEqual(['World', '  house', '  coin', '  Camera']);
        expect(rows[1]).toMatchObject({ hasChildren: true, isFolded: true });
    });

    test("the picker's own folds win over the panel's and leave the panel's as they were", () => {
        const { level, house } = buildPickerLevel();
        level.editorData.setFolded(house.id, true);

        const rows = EntityPickerRows.build(level, new Map([[house.id, false]]), '');

        expect(namesOf(level, rows)).toEqual(['World', '  house', '    door', '    window', '  coin', '  Camera']);
        expect(level.editorData.isFolded(house.id)).toBe(true);
    });

    test('a search shows the matching entities with their parents, unfolded', () => {
        const { level, house } = buildPickerLevel();
        level.editorData.setFolded(house.id, true);

        const rows = EntityPickerRows.build(level, new Map(), ' DOO ');

        expect(namesOf(level, rows)).toEqual(['World', '  house', '    door']);
        expect(rows.map((row) => row.isMatch)).toEqual([false, false, true]);
    });

    test('a search nothing holds shows no row', () => {
        const { level } = buildPickerLevel();

        expect(EntityPickerRows.build(level, new Map(), 'zebra')).toEqual([]);
    });
});
