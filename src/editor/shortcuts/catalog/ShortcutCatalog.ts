import { SHORTCUT_AREAS } from '../../commands/index.ts';
import type { CommandRegistry, EditorCommand, MenuName, ShortcutArea } from '../../commands/index.ts';
import { TOOL_KEYS, TOOL_NAMES } from '../../tools/index.ts';
import type { ToolId } from '../../tools/index.ts';
import type { KeyboardPlatform } from '../KeyboardInputData.ts';
import { KeyChord } from '../KeyChord.ts';
import { altName, ctrlName } from '../modifierNames.ts';
import type { ShortcutMap } from '../ShortcutMap.ts';

import { FIXED_KEY_SHORTCUTS, MOUSE_SHORTCUTS } from './fixedShortcuts.ts';
import type { ShortcutKeys, ShortcutRow, ShortcutSection } from './ShortcutRow.ts';

// A command's area when it names none: its menu's, or Editing for a command only a shortcut runs (the
// nudges, turns and resizes). Help's only shortcut is the shortcut list's own, which the v4 design draws
// with the view switches.
const MENU_AREAS: Readonly<Record<MenuName, ShortcutArea>> = {
    Play: 'Test play',
    File: 'File',
    Edit: 'Editing',
    Arrange: 'Editing',
    View: 'View',
    Help: 'View',
};

type CatalogSources = {
    readonly shortcuts: ShortcutMap;
    readonly registry: CommandRegistry;
    // The tools the editor has, whose number keys are shortcuts too.
    readonly toolIds: readonly ToolId[];
    readonly platform: KeyboardPlatform;
};

type GrowingRow = {
    readonly name: string;
    readonly area: ShortcutArea;
    readonly keys: ShortcutKeys[];
};

// The shortcut list: every shortcut in ShortcutMap under its command's name, the tools' keys, and the
// fixed rows, spelled for the platform. Built from the map, so a shortcut added later shows with no work.
export class ShortcutCatalog {
    readonly sections: readonly ShortcutSection[];

    private constructor(sections: readonly ShortcutSection[]) {
        this.sections = sections;
    }

    static build(sources: CatalogSources) {
        const rows = new RowCollector();

        for (const toolId of sources.toolIds) {
            const chord = KeyChord.parse(TOOL_KEYS[toolId]);
            const caps = chord.caps(sources.platform);
            rows.add(TOOL_NAMES[toolId], 'Tools', caps);
        }

        rows.addFixed(FIXED_KEY_SHORTCUTS, sources.platform);

        for (const shortcut of sources.shortcuts.all) {
            const command = sources.registry.find(shortcut.commandId);
            if (command === undefined) {
                throw new Error(`The shortcut map names a missing command ${shortcut.commandId}.`);
            }

            const caps = shortcut.chord.caps(sources.platform);
            const name = command.shortcutName ?? command.label;
            rows.add(name, areaOf(command), caps);
        }

        rows.addFixed(MOUSE_SHORTCUTS, sources.platform);

        const sections = rows.sections();

        return new ShortcutCatalog(sections);
    }

    get rows() {
        return this.sections.flatMap((section) => section.rows);
    }
}

// Rows in the order they come, the keys of one name and area gathered into one row.
class RowCollector {
    private readonly rows: GrowingRow[] = [];

    add(name: string, area: ShortcutArea, keys: ShortcutKeys) {
        const existing = this.rows.find((row) => row.name === name && row.area === area);

        if (existing !== undefined) {
            existing.keys.push(keys);
            return;
        }

        this.rows.push({ name, area, keys: [keys] });
    }

    addFixed(fixedRows: readonly ShortcutRow[], platform: KeyboardPlatform) {
        for (const row of fixedRows) {
            for (const keys of row.keys) {
                const spelled = spellFixedKeys(keys, platform);
                this.add(row.name, row.area, spelled);
            }
        }
    }

    sections() {
        const sections: ShortcutSection[] = [];

        for (const area of SHORTCUT_AREAS) {
            const rows = this.rows.filter((row) => row.area === area);
            if (rows.length === 0) continue;

            sections.push({ area, rows });
        }

        return sections;
    }
}

function areaOf(command: EditorCommand) {
    if (command.shortcutArea !== undefined) return command.shortcutArea;
    if (command.menu === undefined) return 'Editing';

    return MENU_AREAS[command.menu.menu];
}

function spellFixedKeys(keys: ShortcutKeys, platform: KeyboardPlatform) {
    return keys.map((key) => {
        if (key === 'Ctrl') return ctrlName(platform);
        if (key === 'Alt') return altName(platform);

        return key;
    });
}
