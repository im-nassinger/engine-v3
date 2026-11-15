import type { CommandRegistry, CommandRunner, ShortcutScope } from '../commands/index.ts';

import type { FocusPlace } from './FocusPlace.ts';
import type { KeyboardInputData, KeyboardPlatform } from './KeyboardInputData.ts';
import { KeyPress } from './KeyPress.ts';
import { ShortcutMap } from './ShortcutMap.ts';
import type { Shortcut } from './ShortcutMap.ts';

// Where the keyboard and the mouse are when a key goes down.
type KeyPlace = {
    readonly focus: FocusPlace;
    readonly pointerOverLevelView: boolean;
};

// The narrowest scope wins when one press matches in several.
const SCOPES_IN_ORDER: readonly ShortcutScope[] = ['levelView', 'editor', 'everywhere'];

// Turns a key press into a command run through the CommandRunner. The tools and the Esc chain join it
// in stage 9; until then a menu or a dialog handles Esc itself.
export class ShortcutDispatcher {
    private readonly registry: CommandRegistry;
    private readonly runner: CommandRunner;
    private readonly platform: KeyboardPlatform;
    private readonly shortcuts: ShortcutMap;

    constructor(registry: CommandRegistry, runner: CommandRunner, platform: KeyboardPlatform) {
        this.registry = registry;
        this.runner = runner;
        this.platform = platform;
        this.shortcuts = ShortcutMap.fromRegistry(registry);
    }

    // True when the editor used the key, so the adapter stops the browser's default; false leaves the
    // key to the browser or to the focused field.
    handleKeyDown(input: KeyboardInputData, focus: FocusPlace, pointerOverLevelView: boolean) {
        const isDialogOpen = this.runner.dialog.current !== undefined;
        if (isDialogOpen) return false;

        const press = KeyPress.fromKeyboard(input, this.platform);
        if (press === undefined) return false;

        const place = { focus, pointerOverLevelView };
        const shortcut = this.shortcutFor(press, place);
        if (shortcut === undefined) return false;

        const command = this.registry.find(shortcut.commandId);
        if (command === undefined) return false;

        if (press.repeat && !command.repeatsWhileHeld) return true;

        this.runner.run(command);

        return true;
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

function worksIn(shortcut: Shortcut, place: KeyPlace) {
    const isTyping = place.focus === 'textField' || place.focus === 'codeEditor';

    if (shortcut.scope === 'everywhere') return true;
    if (shortcut.scope === 'editor') return !isTyping;

    return place.pointerOverLevelView && !isTyping;
}
