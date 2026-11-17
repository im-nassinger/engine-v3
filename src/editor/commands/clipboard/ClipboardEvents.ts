import type { CommandRegistry } from '../CommandRegistry.ts';
import type { CommandRunner } from '../running/CommandRunner.ts';

import { CopyCommand } from './CopyCommand.ts';
import { CutCommand } from './CutCommand.ts';
import { PasteCommand } from './PasteCommand.ts';

// What the browser's cut, copy and paste events do in the editor, outside text fields: Cut, Copy and
// Paste with the event's own data, their outcomes shown through the CommandRunner as a key's would be.
// Nothing happens while a dialog is open, as with the other keys, nor during play, when the keys belong
// to the game.
export class ClipboardEvents {
    private readonly copyCommand: CopyCommand;
    private readonly cutCommand: CutCommand;
    private readonly pasteCommand: PasteCommand;
    private readonly runner: CommandRunner;

    constructor(registry: CommandRegistry, runner: CommandRunner) {
        this.copyCommand = requireCommand(registry, 'edit.copy', CopyCommand);
        this.cutCommand = requireCommand(registry, 'edit.cut', CutCommand);
        this.pasteCommand = requireCommand(registry, 'edit.paste', PasteCommand);
        this.runner = runner;
    }

    // The text for the event to carry, or undefined when nothing was copied: the event is then the
    // browser's.
    copy() {
        if (this.isIgnored()) return undefined;

        const copied = this.copyCommand.copy();
        if (copied.kind === 'refused') {
            this.runner.showOutcome(copied);
            return undefined;
        }

        this.runner.showOutcome({ kind: 'done', skipped: copied.skipped });

        return copied.text;
    }

    // As copy, and the copied entities are deleted in one step.
    cut() {
        if (this.isIgnored()) return undefined;

        const { outcome, text } = this.cutCommand.cut();
        this.runner.showOutcome(outcome);

        return text;
    }

    // False while a dialog is open or during play: the event is then the browser's.
    paste(text: string) {
        if (this.isIgnored()) return false;

        const outcome = this.pasteCommand.pasteText(text);
        this.runner.showOutcome(outcome);

        return true;
    }

    private isIgnored() {
        if (this.runner.isRunGoing) return true;

        return this.runner.dialog.current !== undefined;
    }
}

type CommandClass<T> = abstract new (...args: never[]) => T;

function requireCommand<T>(registry: CommandRegistry, id: string, commandClass: CommandClass<T>) {
    const command = registry.find(id);
    if (!(command instanceof commandClass)) throw new Error(`The registry has no ${id} command of its own.`);

    return command;
}
