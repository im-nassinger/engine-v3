import type { VersionCounter } from '../../core/events/index.ts';
import type { Point } from '../../core/geometry/index.ts';
import type { EntityId } from '../../core/level/index.ts';
import type { LevelReader } from '../../core/level-data/index.ts';
import type { CommandRegistry } from '../commands/index.ts';
import type { OpenLevel } from '../session/index.ts';
import type { Snapper } from '../snapping/index.ts';
import type { StatusText } from '../status/index.ts';
import type { ViewState } from '../view/index.ts';

// The seven tools of the requirement. v1 builds select, shape and joint.
export type ToolId = 'select' | 'pencil' | 'pen' | 'shape' | 'text' | 'joint' | 'trigger';

export type PointerButton = 'left' | 'middle' | 'right';

// Ctrl is Cmd on a Mac, read so by the browser adapter.
export type Modifiers = {
    readonly shift: boolean;
    readonly alt: boolean;
    readonly ctrl: boolean;
};

// A pointer event on the level view, already converted by the browser adapter.
export type LevelPointerInput = {
    readonly levelPosition: Point;
    // CSS pixels from the level view's top left corner.
    readonly screenPosition: Point;
    readonly button: PointerButton;
    readonly modifiers: Modifiers;
    // 2 for a double-click.
    readonly clickCount: number;
};

// A key as a tool reads it. editor/shortcuts' KeyPress has this shape, so the dispatcher passes its
// press as it is and this module never imports the shortcuts.
export type ToolKey = {
    readonly code: string;
    readonly key: string;
    readonly ctrl: boolean;
    readonly shift: boolean;
    readonly alt: boolean;
    readonly repeat: boolean;
};

export type ToolContext = {
    // Read when used: New and Import replace the open level.
    readonly openLevel: OpenLevel;
    readonly view: ViewState;
    readonly snapper: Snapper;
    readonly commands: CommandRegistry;
    readonly status: StatusText;
    // Reads a new entity's data into the level, for the edits that add one.
    readonly reader: LevelReader;
    // Selects what the tool made and returns to Select, unless the tool is locked.
    finished(created: readonly EntityId[]): void;
};

// Every tool, behind one contract, so each is tested without a browser. A tool never changes the level
// directly: it runs a command or uses LiveEdit.
export type Tool = {
    readonly id: ToolId;
    // The status bar's tool hint.
    readonly hint: string;
    // Moves when what the tool draws over the level changes.
    readonly preview: VersionCounter;
    activate(context: ToolContext): void;
    // Finishes and keeps an unfinished drawing.
    deactivate(): void;
    pointerDown(input: LevelPointerInput): void;
    pointerMove(input: LevelPointerInput): void;
    pointerUp(input: LevelPointerInput): void;
    // True when the tool used the key (Enter, Backspace, Shift).
    keyDown(key: ToolKey): boolean;
    keyUp(key: ToolKey): void;
    // Ctrl+Z, before Undo: removes the last step of an unfinished drawing, a polygon's last point. True
    // when the tool used it.
    undoDrawingStep(): boolean;
    // Esc: the drag in progress or the unfinished drawing. True when there was something to cancel.
    cancel(): boolean;
};
