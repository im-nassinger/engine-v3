import type { PickedFile } from '../../saving/index.ts';
import type { CommandRegistry } from '../CommandRegistry.ts';
import type { CommandRunner } from '../running/CommandRunner.ts';

import { ImportCommand } from './ImportCommand.ts';

// What a file dropped on the editor does: Import's question, then the import, shown through the
// CommandRunner like the menu's Import. Nothing happens while a dialog is open, as with the keys.
export class FileDropEvents {
    private readonly importCommand: ImportCommand;
    private readonly runner: CommandRunner;

    constructor(registry: CommandRegistry, runner: CommandRunner) {
        const command = registry.find('file.import');
        if (!(command instanceof ImportCommand)) throw new Error('The registry has no file.import command of its own.');

        this.importCommand = command;
        this.runner = runner;
    }

    dropFile(file: PickedFile) {
        const isDialogOpen = this.runner.dialog.current !== undefined;
        if (isDialogOpen) return;

        const outcome = this.importCommand.importDropped(file);
        this.runner.showOutcome(outcome);
    }
}
