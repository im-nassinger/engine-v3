import type { CommandRegistry, CommandRunner, ShortcutScope } from '../commands/index.ts';
import { TOOL_KEYS } from '../tools/index.ts';
import type { EscapeChain, ToolController, ToolId } from '../tools/index.ts';

import type { FocusPlace } from './FocusPlace.ts';
import { KeyChord } from './KeyChord.ts';
import type { KeyboardInputData, KeyboardPlatform } from './KeyboardInputData.ts';
import { KeyPress } from './KeyPress.ts';
import { ShortcutMap } from './ShortcutMap.ts';
import type { Shortcut } from './ShortcutMap.ts';

// Where the keyboard and the mouse are when a key goes down.
type KeyPlace = {
    readonly focus: FocusPlace;
    readonly pointerOverLevelView: boolean;
};

// The tools and Esc. Left out, the dispatcher runs commands only.
export type ToolKeys = {
    readonly tools: ToolController;
    readonly escape: EscapeChain;
};

type ToolChord = {
    readonly toolId: ToolId;
    readonly chord: KeyChord;
};

const ESCAPE_KEY = 'Escape';

// Ctrl+Z, whatever the layout puts it on, reaches a drawing in progress before Undo does.
const UNDO_COMMAND_ID = 'edit.undo';

// The narrowest scope wins when one press matches in several.
const SCOPES_IN_ORDER: readonly ShortcutScope[] = ['levelView', 'editor', 'everywhere'];

// Turns a key press into Esc's answer, a tool picked, a key the tool uses, or a command run through
// the CommandRunner, in that order.
export class ShortcutDispatcher {
    private readonly registry: CommandRegistry;
    private readonly runner: CommandRunner;
    private readonly platform: KeyboardPlatform;
    private readonly shortcuts: ShortcutMap;
    private readonly toolKeys: ToolKeys | undefined;
    private readonly toolChords: readonly ToolChord[];

    constructor(registry: CommandRegistry, runner: CommandRunner, platform: KeyboardPlatform, toolKeys?: ToolKeys) {
        this.registry = registry;
        this.runner = runner;
        this.platform = platform;
        this.shortcuts = ShortcutMap.fromRegistry(registry);
        this.toolKeys = toolKeys;
        this.toolChords = toolChordsOf(toolKeys);
    }

    // True when the editor used the key, so the adapter stops the browser's default; false leaves the
    // key to the browser or to the focused field.
    handleKeyDown(input: KeyboardInputData, focus: FocusPlace, pointerOverLevelView: boolean) {
        const isDialogOpen = this.runner.dialog.current !== undefined;
        if (isDialogOpen) return false;

        const press = KeyPress.fromKeyboard(input, this.platform);
        if (press === undefined) return false;

        const usedByTools = this.handleToolKey(press, focus);
        if (usedByTools !== undefined) return usedByTools;

        const place = { focus, pointerOverLevelView };
        const shortcut = this.shortcutFor(press, place);
        if (shortcut === undefined) return false;

        const command = this.registry.find(shortcut.commandId);
        if (command === undefined) return false;
        // The browser goes on to send its cut, copy or paste event, which ClipboardBridge answers.
        if (command.shortcutsAsBrowserEvents === true) return false;

        if (press.repeat && !command.repeatsWhileHeld) return true;
        if (command.id === UNDO_COMMAND_ID && this.toolKeys?.tools.undoDrawingStep() === true) return true;

        this.runner.run(command);

        return true;
    }

    // Space going up ends a pan, and Shift going up ends a tool's axis lock, wherever the keyboard is.
    handleKeyUp(input: KeyboardInputData) {
        if (this.toolKeys === undefined) return;

        const press = KeyPress.fromKeyboard(input, this.platform);
        if (press === undefined) return;

        this.toolKeys.tools.keyUp(press);
    }

    // undefined when the key isn't the tools': it goes on to the commands.
    private handleToolKey(press: KeyPress, focus: FocusPlace) {
        if (this.toolKeys === undefined) return undefined;

        // A field being typed in handles its own Esc, and single keys type there.
        if (isTypingIn(focus)) return undefined;

        if (press.key === ESCAPE_KEY) {
            this.toolKeys.escape.press();
            return true;
        }

        const toolChord = this.toolChords.find((candidate) => candidate.chord.matches(press));
        if (toolChord !== undefined) {
            // A held number key would lock the tool it just picked.
            if (!press.repeat) {
                this.toolKeys.tools.pick(toolChord.toolId);
            }
            return true;
        }

        const usedByTool = this.toolKeys.tools.keyDown(press);
        if (usedByTool) return true;

        return undefined;
    }

    private shortcutFor(press: KeyPress, place: KeyPlace) {
        const matching = this.shortcuts.matching(press);

        for (const scope of SCOPES_IN_ORDER) {
            const inScope = matching.find((shortcut) => shortcut.scope === scope);
            if (inScope === undefined) continue;
            if (!worksIn(inScope, place)) continue;

            return inScope;
        }

        return undefined;
    }
}

function toolChordsOf(toolKeys: ToolKeys | undefined) {
    if (toolKeys === undefined) return [];

    const chords: ToolChord[] = [];
    for (const tool of toolKeys.tools.tools) {
        const chord = KeyChord.parse(TOOL_KEYS[tool.id]);
        chords.push({ toolId: tool.id, chord });
    }

    return chords;
}

function isTypingIn(focus: FocusPlace) {
    return focus === 'textField' || focus === 'codeEditor';
}

function worksIn(shortcut: Shortcut, place: KeyPlace) {
    const isTyping = isTypingIn(place.focus);

    if (shortcut.scope === 'everywhere') return true;
    if (shortcut.scope === 'editor') return !isTyping;

    return place.pointerOverLevelView && !isTyping;
}
