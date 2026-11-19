import type { SkippedEntity } from '../history/index.ts';

export type CommandId = string;

// 'Play' isn't a submenu: its commands are plain entries at the top of the main menu.
export type MenuName = 'Play' | 'File' | 'Edit' | 'Arrange' | 'View' | 'Help';

// Sections are split by a line in the menu; order sorts within a section.
export type MenuPlace = {
    readonly menu: MenuName;
    readonly section: number;
    readonly order: number;
};

// A disabled entry's tooltip shows the reason.
export type Availability = { readonly enabled: true } | { readonly enabled: false; readonly reason: string };

// A question a command asks before it acts: "Replace the open level?". confirmLabel names the button
// that goes ahead ("Replace"); the other button is Cancel unless cancelLabel names it.
export type Question = {
    readonly title: string;
    readonly text: string;
    readonly confirmLabel: string;
    // Only the damaged level's notice, which changes nothing either way: Close.
    readonly cancelLabel?: string;
};

// Something to read, closed with OK only: About.
export type Notice = {
    readonly title: string;
    readonly text: string;
};

// A line of text a command asks for before it acts: the level's new name. value is what the field starts with.
export type TextRequest = {
    readonly title: string;
    readonly text: string;
    readonly fieldLabel: string;
    readonly value: string;
    readonly confirmLabel: string;
};

// text is what the command did, for the message pill: "Undid: Delete Square". CommandRunner decides how
// each kind is shown; a command never calls the UI.
export type CommandOutcome =
    | { readonly kind: 'done'; readonly text?: string; readonly skipped?: readonly SkippedEntity[] }
    | { readonly kind: 'refused'; readonly reason: string }
    | { readonly kind: 'needsConfirmation'; readonly question: Question; confirm(): CommandOutcome }
    | { readonly kind: 'needsText'; readonly request: TextRequest; submit(text: string): CommandOutcome }
    | { readonly kind: 'notice'; readonly notice: Notice };

// Where a command's shortcuts work, from the requirement's shortcut table: 'everywhere' even while
// typing, 'editor' unless the keyboard is in a text field or the code editor, 'levelView' only with the
// mouse over the level view.
export type ShortcutScope = 'everywhere' | 'editor' | 'levelView';

// Every menu entry and shortcut runs one. Shortcuts are written as the requirement writes them
// ('Ctrl+Shift+Z'); editor/shortcuts' KeyChord reads them.
export type EditorCommand = {
    readonly id: CommandId;
    readonly label: string;
    // Missing for a command only a shortcut runs: the twelve nudges and four turns would crowd the Edit menu,
    // Select all, Rename and Hide or show are in no menu for now (owner, 2026-11-18), and Pause and Step
    // are on the Play bar.
    readonly menu?: MenuPlace;
    readonly shortcuts: readonly string[];
    // 'editor' when missing.
    readonly shortcutScope?: ShortcutScope;
    // A shortcut whose scope differs from shortcutScope, by its text. Only Play's Shift+T, a letter that
    // must still type a T in a field while Ctrl+Enter plays from anywhere.
    readonly shortcutScopes?: Readonly<Record<string, ShortcutScope>>;
    // Only the zoom keys, the nudges and Z and X: holding the key runs the command again with each key
    // repeat. Every other command runs once per press, so holding Ctrl+Z doesn't undo 30 steps a second.
    readonly repeatsWhileHeld?: boolean;
    // Only Cut, Copy and Paste: the browser sends its own cut, copy and paste events for their keys,
    // which need no permission, so ShortcutDispatcher leaves the keys to the browser and ClipboardBridge
    // answers the events. The menu still shows the shortcuts.
    readonly shortcutsAsBrowserEvents?: boolean;
    // Only Play or Stop, Pause and Step: CommandRunner refuses every other command while a run is going.
    readonly runsDuringPlay?: boolean;
    availability(): Availability;
    // Only a switch has it: true shows a tick next to the menu entry.
    checked?(): boolean;
    run(): CommandOutcome;
};

// A command with a place in a menu, as CommandRegistry.menu returns it.
export type MenuCommand = EditorCommand & { readonly menu: MenuPlace };
