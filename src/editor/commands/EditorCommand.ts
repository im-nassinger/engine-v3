import type { SkippedEntity } from '../history/index.ts';

export type CommandId = string;

export type MenuName = 'File' | 'Edit' | 'Arrange' | 'View' | 'Play' | 'Tools' | 'Help';

// Sections are split by a line in the menu; order sorts within a section.
export type MenuPlace = {
    readonly menu: MenuName;
    readonly section: number;
    readonly order: number;
};

// A disabled entry's tooltip shows the reason.
export type Availability = { readonly enabled: true } | { readonly enabled: false; readonly reason: string };

// text is what the command did, for the status bar: "Undid: Delete Square".
export type CommandOutcome =
    | { readonly kind: 'done'; readonly text?: string; readonly skipped?: readonly SkippedEntity[] }
    | { readonly kind: 'refused'; readonly reason: string };

// Every menu entry and shortcut runs one. Shortcuts are written as the requirement writes them
// ('Ctrl+Shift+Z'); stage 6's KeyChord reads them.
export type EditorCommand = {
    readonly id: CommandId;
    readonly label: string;
    readonly menu: MenuPlace;
    readonly shortcuts: readonly string[];
    availability(): Availability;
    // Only a switch has it: true shows a tick next to the menu entry.
    checked?(): boolean;
    run(): CommandOutcome;
};
