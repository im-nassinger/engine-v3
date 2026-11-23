import type { ShortcutArea } from '../../commands/index.ts';

// One way to press a shortcut, key by key as the platform names them: ['Cmd', 'Shift', 'Z'] on a Mac.
export type ShortcutKeys = readonly string[];

// A line of the shortcut list: what it does, and every way to press it.
export type ShortcutRow = {
    readonly name: string;
    readonly area: ShortcutArea;
    readonly keys: readonly ShortcutKeys[];
};

// An area's section of the list, its rows in the order the list shows them.
export type ShortcutSection = {
    readonly area: ShortcutArea;
    readonly rows: readonly ShortcutRow[];
};
