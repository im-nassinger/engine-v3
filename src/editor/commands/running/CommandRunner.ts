import type { StatusText } from '../../status/index.ts';
import { outcomeText } from '../../status/index.ts';
import type { CommandOutcome, EditorCommand } from '../EditorCommand.ts';

import { OpenDialog } from './OpenDialog.ts';

// Test play as the runner sees it: while a run is going, only the Play commands run, and every other
// command is refused with the Play bar's "Stop to edit". PlaySession is one.
export type PlayGate = {
    readonly isRunGoing: boolean;
    refuseEdit(): void;
};

export type CommandRunnerParts = {
    // Given when the page builds something that needs the dialog before the runner: PlaySession.
    readonly dialog?: OpenDialog;
    readonly play?: PlayGate;
};

// Every caller (the menu, the buttons, ShortcutDispatcher) runs commands through here, so every
// outcome is shown the same way: a sentence as status text, a question or a notice as the dialog.
export class CommandRunner {
    readonly dialog: OpenDialog;
    private readonly status: StatusText;
    private readonly play: PlayGate | undefined;

    constructor(status: StatusText, parts: CommandRunnerParts = {}) {
        this.status = status;
        this.dialog = parts.dialog ?? new OpenDialog();
        this.play = parts.play;
    }

    // From Play until Stop: the keyboard belongs to the game, and the editor can't be changed.
    get isRunGoing() {
        return this.play?.isRunGoing === true;
    }

    // True, with "Stop to edit" on the Play bar, while a run is going: for the edits that don't come
    // through run, such as a dropped file.
    refusedDuringPlay() {
        if (this.play === undefined) return false;
        if (!this.play.isRunGoing) return false;

        this.play.refuseEdit();

        return true;
    }

    // A disabled command isn't run; its reason is shown as status text, like a refusal. During play only
    // the Play commands run: Stop must give back the level, the selection, the view and the tool as they
    // were, so the rest are refused.
    run(command: EditorCommand) {
        if (command.runsDuringPlay !== true && this.refusedDuringPlay()) return;

        const availability = command.availability();

        if (!availability.enabled) {
            this.status.show(availability.reason);
            return;
        }

        const outcome = command.run();
        this.showOutcome(outcome);
    }

    // The open question's go-ahead button. Closing a notice with OK is closeDialog.
    confirmDialog() {
        const dialog = this.dialog.current;
        if (dialog === undefined) return;
        if (dialog.kind !== 'question') return;

        this.dialog.closeCurrent();
        const outcome = dialog.confirm();
        this.showOutcome(outcome);
    }

    // The text request's go-ahead button, or Enter in its field.
    submitDialogText(text: string) {
        const dialog = this.dialog.current;
        if (dialog === undefined) return;
        if (dialog.kind !== 'textRequest') return;

        this.dialog.closeCurrent();
        const outcome = dialog.submit(text);
        this.showOutcome(outcome);
    }

    // Cancel on a question or a text request, OK on a notice, or Esc on any: closes it and changes nothing.
    closeDialog() {
        this.dialog.closeCurrent();
    }

    // Also for the few edits that aren't commands but can ask first: the Entities panel's drop.
    showOutcome(outcome: CommandOutcome) {
        if (outcome.kind === 'needsConfirmation') {
            const confirm = () => outcome.confirm();
            this.dialog.open({ kind: 'question', question: outcome.question, confirm });
            return;
        }

        if (outcome.kind === 'needsText') {
            const submit = (text: string) => outcome.submit(text);
            this.dialog.open({ kind: 'textRequest', request: outcome.request, submit });
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
