import { VersionCounter } from '../../../core/events/index.ts';
import type { CommandOutcome, Notice, Question } from '../EditorCommand.ts';

export type Dialog =
    | { readonly kind: 'question'; readonly question: Question; confirm(): CommandOutcome }
    | { readonly kind: 'notice'; readonly notice: Notice };

// The one dialog on screen. A dialog that comes while one is open waits behind it, in order, so the
// page never shows two at once.
export class OpenDialog {
    readonly version = new VersionCounter();
    private readonly dialogs: Dialog[] = [];

    get current(): Dialog | undefined {
        return this.dialogs[0];
    }

    get waitingCount() {
        return Math.max(this.dialogs.length - 1, 0);
    }

    open(dialog: Dialog) {
        this.dialogs.push(dialog);

        const isShownNow = this.dialogs.length === 1;
        if (isShownNow) {
            this.version.increment();
        }
    }

    // Closes the dialog on screen and shows the next one waiting, if any.
    closeCurrent() {
        const closed = this.dialogs.shift();
        if (closed === undefined) return undefined;

        this.version.increment();

        return closed;
    }
}
