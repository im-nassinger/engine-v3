import { LevelWriter } from '../../../core/level-data/index.ts';
import { ClipboardCodec } from '../../clipboard/index.ts';
import type { EditorSession } from '../../session/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';
import { removeEntities } from '../shared/removeEntities.ts';
import { skippedRefusal } from '../shared/skippedRefusal.ts';
import { stepLabel } from '../shared/stepLabel.ts';

import type { ClipboardParts } from './ClipboardParts.ts';
import { copySelection, selectionSplit } from './copySelection.ts';

const CUT = 'cut';

// Copy, then Delete, in one step "Cut 3 entities": the joints attached to what is removed go too, as
// Delete's rule says, though they were not copied.
export class CutCommand implements EditorCommand {
    readonly id = 'edit.cut';
    readonly label = 'Cut';
    readonly menu = { menu: 'Edit', section: 2, order: 10 } as const;
    readonly shortcuts = ['Ctrl+X'];
    private readonly session: EditorSession;
    private readonly parts: ClipboardParts;
    private readonly codec = new ClipboardCodec(new LevelWriter());

    constructor(session: EditorSession, parts: ClipboardParts) {
        this.session = session;
        this.parts = parts;
    }

    availability(): Availability {
        const split = selectionSplit(this.session);
        const refusal = skippedRefusal(split, CUT);
        if (refusal !== undefined) return { enabled: false, reason: refusal };

        return { enabled: true };
    }

    // The outcome and the clipboard text, kept as the last copy, for a caller that writes the text
    // somewhere itself: the browser's cut event.
    cut() {
        const copied = copySelection(this.session, this.codec, CUT);
        if (copied.kind === 'refused') return { outcome: copied, text: undefined };

        this.parts.clipboard.keep(copied.text);
        const label = stepLabel('Cut', copied.split.allowed);
        const outcome = removeEntities(this.session, label, copied.split.allowed, copied.skipped);

        return { outcome, text: copied.text };
    }

    run(): CommandOutcome {
        return this.cut().outcome;
    }
}
