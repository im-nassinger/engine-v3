import { describe, expect, test } from 'vitest';

import type { ShortcutRow, ShortcutSection } from './ShortcutRow.ts';
import { ShortcutSearch } from './ShortcutSearch.ts';

const UNDO: ShortcutRow = { name: 'Undo', area: 'Editing', keys: [['Ctrl', 'Z']] };
const REDO: ShortcutRow = {
    name: 'Redo',
    area: 'Editing',
    keys: [
        ['Ctrl', 'Shift', 'Z'],
        ['Ctrl', 'Y'],
    ],
};
const ROTATE: ShortcutRow = { name: 'Rotate 1°', area: 'Editing', keys: [['Z'], ['X']] };
const ZOOM_IN: ShortcutRow = { name: 'Zoom in', area: 'View', keys: [['+'], ['='], ['Ctrl', '=']] };
const GRID: ShortcutRow = { name: 'Grid', area: 'View', keys: [['G']] };
const GRID_SNAPPING: ShortcutRow = { name: 'Grid snapping', area: 'View', keys: [['Shift', 'G']] };
const DELETE: ShortcutRow = { name: 'Delete', area: 'Editing', keys: [['Del'], ['Backspace']] };
const PAN: ShortcutRow = { name: 'Pan', area: 'Mouse', keys: [['Middle drag'], ['Space', 'Drag']] };
const PEN: ShortcutRow = { name: 'Bézier pen', area: 'Tools', keys: [['4']] };
const LIST: ShortcutRow = { name: 'Shortcut list', area: 'View', keys: [['?']] };

const SECTIONS: readonly ShortcutSection[] = [
    { area: 'Tools', rows: [PEN] },
    { area: 'Editing', rows: [UNDO, REDO, ROTATE, DELETE] },
    { area: 'View', rows: [ZOOM_IN, GRID, GRID_SNAPPING, LIST] },
    { area: 'Mouse', rows: [PAN] },
];

function namesFound(query: string) {
    const search = new ShortcutSearch(query);
    const sections = search.filter(SECTIONS);

    return sections.flatMap((section) => section.rows.map((row) => row.name));
}

describe('ShortcutSearch', () => {
    test('finds by the keys, case and order not counting', () => {
        expect(namesFound('ctrl z')).toEqual(['Undo', 'Redo']);
        expect(namesFound('Z CTRL')).toEqual(['Undo', 'Redo']);
        expect(namesFound('ctrl+z')).toEqual(['Undo', 'Redo']);
        expect(namesFound('shift ctrl z')).toEqual(['Redo']);
    });

    test('finds by the words of the name, and by a word or key begun', () => {
        expect(namesFound('grid')).toEqual(['Grid', 'Grid snapping']);
        expect(namesFound('SNAPPING grid')).toEqual(['Grid snapping']);
        expect(namesFound('gri')).toEqual(['Grid', 'Grid snapping']);
        expect(namesFound('back')).toEqual(['Delete']);
        expect(namesFound('rotate 1')).toEqual(['Rotate 1°']);
    });

    test('mixes name words and keys', () => {
        expect(namesFound('grid shift')).toEqual(['Grid snapping']);
        expect(namesFound('pan drag')).toEqual(['Pan']);
    });

    test('takes one character as a whole key, so "ctrl z" does not find Zoom in', () => {
        expect(namesFound('z')).toEqual(['Undo', 'Redo', 'Rotate 1°']);
        expect(namesFound('?')).toEqual(['Shortcut list']);
        expect(namesFound('+')).toEqual(['Zoom in']);
        expect(namesFound('ctrl++')).toEqual(['Zoom in']);
        expect(namesFound('ctrl =')).toEqual(['Zoom in']);
    });

    test('ignores accents', () => {
        expect(namesFound('bezier')).toEqual(['Bézier pen']);
    });

    test('shows everything for an empty search, and drops areas with nothing left', () => {
        const everything = new ShortcutSearch('  ').filter(SECTIONS);
        const gridOnly = new ShortcutSearch('grid').filter(SECTIONS);
        const nothing = new ShortcutSearch('nothing').filter(SECTIONS);

        expect(everything).toEqual(SECTIONS);
        expect(gridOnly.map((section) => section.area)).toEqual(['View']);
        expect(nothing).toEqual([]);
    });
});
