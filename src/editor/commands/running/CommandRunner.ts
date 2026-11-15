import type { StatusText } from '../../status/index.ts';
import { outcomeText } from '../../status/index.ts';
import type { CommandOutcome, EditorCommand } from '../EditorCommand.ts';

import { OpenDialog } from './OpenDialog.ts';

// Every caller (the menu, the buttons, ShortcutDispatcher) runs commands through here, so every
// outcome is shown the same way: a sentence as status text, a question or a notice as the dialog.
export class CommandRunner {
    readonly dialog = new OpenDialog();
    private readonly status: StatusText;

    constructor(status: StatusText) {
        this.status = status;
    }

    // A disabled command isn't run; its reason is shown as status text, like a refusal.
    run(command: EditorCommand) {
        const availability = command.availability();

        if (!availability.enabled) {
            this.status.show(availability.reason);
            return;
        }

        const outcome = command.run();
        this.show(outcome);
    }

    // The open question's go-ahead button. Closing a notice with OK is closeDialog.
    confirmDialog() {
        const dialog = this.dialog.current;
        if (dialog === undefined) return;
        if (dialog.kind !== 'question') return;

        this.dialog.closeCurrent();
        const outcome = dialog.confirm();
        this.show(outcome);
    }

    // Cancel on a question, OK on a notice, or Esc on either: closes it and changes nothing.
    closeDialog() {
        this.dialog.closeCurrent();
    }

    private show(outcome: CommandOutcome) {
        if (outcome.kind === 'needsConfirmation') {
            const confirm = () => outcome.confirm();
            this.dialog.open({ kind: 'question', question: outcome.question, confirm });
            return;
        }

        if (outcome.kind === 'notice') {
            this.dialog.open({ kind: 'notice', notice: outcome.notice });
            return;
        }

        const text = outcomeText(outcome);
        if (text === undefined) return;

        this.status.show(text);
    }
}
