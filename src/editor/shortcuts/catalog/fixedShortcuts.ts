import type { ShortcutRow } from './ShortcutRow.ts';

// Shortcuts no command or tool holds, written with Ctrl and Alt as the requirement does; ShortcutCatalog
// spells them for the platform. Only the ones built so far: the requirement's Later and unscoped rows
// join when their feature does.

// Keys the ShortcutDispatcher and the tools read themselves, not through a command.
export const FIXED_KEY_SHORTCUTS: readonly ShortcutRow[] = [
    { name: 'Pan', area: 'View', keys: [['Space']] },
    { name: 'Cancel, close, or step back', area: 'Editing', keys: [['Esc']] },
];

export const MOUSE_SHORTCUTS: readonly ShortcutRow[] = [
    { name: 'Add to the selection', area: 'Selecting', keys: [['Shift', 'Click']] },
    { name: 'Zoom at the mouse', area: 'Mouse', keys: [['Wheel']] },
    { name: 'Pan sideways', area: 'Mouse', keys: [['Shift', 'Wheel']] },
    { name: 'Pan', area: 'Mouse', keys: [['Middle drag'], ['Space', 'Drag']] },
    {
        name: 'Lock a move to one axis, keep proportions, or snap a rotation to 15°',
        area: 'Mouse',
        keys: [['Shift', 'Drag']],
    },
    {
        name: 'Resize or draw from the centre',
        area: 'Mouse',
        keys: [
            ['Alt', 'Drag'],
            ['Ctrl', 'Shift', 'Drag'],
        ],
    },
    { name: 'Turn snapping off', area: 'Mouse', keys: [['Ctrl', 'Drag']] },
    { name: 'Go into a group, edit points', area: 'Mouse', keys: [['Double-click']] },
];
