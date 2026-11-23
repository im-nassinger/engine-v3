import { describe, expect, test } from 'vitest';

import { CommandRegistry } from '../../commands/index.ts';
import type { EditorCommand } from '../../commands/index.ts';
import { buildPlayTestSession } from '../../commands/play/testing/playTestSession.ts';
import type { ToolId } from '../../tools/index.ts';
import type { KeyboardPlatform } from '../KeyboardInputData.ts';
import { ShortcutMap } from '../ShortcutMap.ts';

import { ShortcutCatalog } from './ShortcutCatalog.ts';

const BUILT_TOOLS: readonly ToolId[] = ['select', 'shape', 'joint', 'pen', 'pencil', 'trigger'];

// Every command the editor registers: the File and Play menus' too.
function editorCatalog(platform: KeyboardPlatform) {
    const { registry } = buildPlayTestSession();
    const shortcuts = ShortcutMap.fromRegistry(registry);
    const catalog = ShortcutCatalog.build({ shortcuts, registry, toolIds: BUILT_TOOLS, platform });

    return { catalog, shortcuts, registry };
}

function rowNamed(catalog: ShortcutCatalog, name: string) {
    const row = catalog.rows.find((candidate) => candidate.name === name);
    if (row === undefined) throw new Error(`No row ${name}.`);

    return row;
}

function commandWith(overrides: Partial<EditorCommand> & { id: string }): EditorCommand {
    return {
        label: overrides.id,
        shortcuts: [],
        availability: () => ({ enabled: true }),
        run: () => ({ kind: 'done' }),
        ...overrides,
    };
}

describe('ShortcutCatalog', () => {
    test.each(['other', 'mac'] as const)('lists every shortcut in the shortcut map, on %s keys', (platform) => {
        const { catalog, shortcuts, registry } = editorCatalog(platform);

        for (const shortcut of shortcuts.all) {
            const command = registry.find(shortcut.commandId);
            const name = command?.shortcutName ?? command?.label;
            const caps = shortcut.chord.caps(platform);
            const listed = catalog.rows.some((row) => {
                const sameName = row.name === name;
                const hasKeys = row.keys.some((keys) => keys.join('+') === caps.join('+'));

                return sameName && hasKeys;
            });

            expect(listed, `${shortcut.commandId} ${caps.join('+')}`).toBe(true);
        }
    });

    test('spells Ctrl as Cmd and Alt as Option on a Mac', () => {
        const mac = editorCatalog('mac').catalog;
        const other = editorCatalog('other').catalog;

        expect(rowNamed(mac, 'Redo').keys).toEqual([
            ['Cmd', 'Shift', 'Z'],
            ['Cmd', 'Y'],
        ]);
        expect(rowNamed(other, 'Redo').keys).toEqual([
            ['Ctrl', 'Shift', 'Z'],
            ['Ctrl', 'Y'],
        ]);
        expect(rowNamed(mac, 'Resize or draw from the centre').keys).toEqual([
            ['Option', 'Drag'],
            ['Cmd', 'Shift', 'Drag'],
        ]);
    });

    test('shows the areas in the design order, each command in its area', () => {
        const { catalog } = editorCatalog('other');
        const areas = catalog.sections.map((section) => section.area);

        expect(areas).toEqual(['Tools', 'Selecting', 'Editing', 'View', 'Test play', 'File', 'Mouse']);
        expect(rowNamed(catalog, 'Select all').area).toBe('Selecting');
        expect(rowNamed(catalog, 'Undo').area).toBe('Editing');
        expect(rowNamed(catalog, 'Group').area).toBe('Editing');
        expect(rowNamed(catalog, 'Grid').area).toBe('View');
        expect(rowNamed(catalog, 'Step one tick').area).toBe('Test play');
        expect(rowNamed(catalog, 'Save in the browser now').area).toBe('File');
    });

    test('lists the tools by their number keys', () => {
        const { catalog } = editorCatalog('other');
        const tools = catalog.sections[0];

        expect(tools?.rows).toEqual([
            { name: 'Select', area: 'Tools', keys: [['1']] },
            { name: 'Shape', area: 'Tools', keys: [['2']] },
            { name: 'Joint', area: 'Tools', keys: [['3']] },
            { name: 'Bézier pen', area: 'Tools', keys: [['4']] },
            { name: 'Pencil', area: 'Tools', keys: [['5']] },
            { name: 'Trigger', area: 'Tools', keys: [['6']] },
        ]);
    });

    test('gathers commands that share a name into one row', () => {
        const { catalog } = editorCatalog('other');

        expect(rowNamed(catalog, 'Move 1 px').keys).toEqual([['Left'], ['Right'], ['Up'], ['Down']]);
        expect(rowNamed(catalog, 'Rotate 10°').keys).toEqual([
            ['Shift', 'Z'],
            ['Shift', 'X'],
        ]);
        expect(rowNamed(catalog, 'Play or stop').keys).toEqual([
            ['Ctrl', 'Enter'],
            ['Shift', 'T'],
        ]);
    });

    test('adds the mouse shortcuts and the keys no command holds as fixed rows', () => {
        const { catalog } = editorCatalog('other');
        const mouse = catalog.sections.find((section) => section.area === 'Mouse');
        const mouseNames = mouse?.rows.map((row) => row.name);

        expect(mouseNames).toContain('Zoom at the mouse');
        expect(mouseNames).toContain('Turn snapping off');
        expect(rowNamed(catalog, 'Add to the selection').area).toBe('Selecting');
        expect(rowNamed(catalog, 'Pan').keys).toEqual([['Space']]);
    });

    test('shows a command added later with no other change, by its menu or its own area', () => {
        const registry = new CommandRegistry();
        registry.register(
            commandWith({
                id: 'view.later',
                label: 'Later view',
                shortcuts: ['Shift+L'],
                menu: { menu: 'View', section: 9, order: 1 },
            }),
        );
        registry.register(commandWith({ id: 'edit.later', label: 'Later edit', shortcuts: ['Ctrl+I'] }));
        registry.register(
            commandWith({
                id: 'pick.later',
                label: 'Later pick',
                shortcuts: ['Ctrl+Shift+L'],
                shortcutArea: 'Selecting',
            }),
        );
        const shortcuts = ShortcutMap.fromRegistry(registry);

        const catalog = ShortcutCatalog.build({ shortcuts, registry, toolIds: [], platform: 'other' });

        expect(rowNamed(catalog, 'Later view').area).toBe('View');
        expect(rowNamed(catalog, 'Later edit').area).toBe('Editing');
        expect(rowNamed(catalog, 'Later pick').area).toBe('Selecting');
    });
});
