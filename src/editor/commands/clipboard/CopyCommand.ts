import { LevelWriter } from '../../../core/level-data/index.ts';
import { ClipboardCodec } from '../../clipboard/index.ts';
import type { EditorSession } from '../../session/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';
import { skippedRefusal } from '../shared/skippedRefusal.ts';

import type { ClipboardParts } from './ClipboardParts.ts';
import { copySelection, selectionSplit } from './copySelection.ts';

const COPIED = 'copied';

// Puts the selection on the clipboard, without the World and the camera, and changes nothing in the level.
export class CopyCommand implements EditorCommand {
    readonly id = 'edit.copy';
    readonly label = 'Copy';
    readonly menu = { menu: 'Edit', section: 2, order: 20 } as const;
    readonly shortcuts = ['Ctrl+C'];
    private readonly session: EditorSession;
    private readonly parts: ClipboardParts;
    private readonly codec = new ClipboardCodec(new LevelWriter());

    constructor(session: EditorSession, parts: ClipboardParts) {
        this.session = session;
        this.parts = parts;
    }

    availability(): Availability {
        const split = selectionSplit(this.session);
        const refusal = skippedRefusal(split, COPIED);
        if (refusal !== undefined) return { enabled: false, reason: refusal };

        return { enabled: true };
    }

    // The clipboard text, kept as the last copy, for a caller that writes it somewhere itself: the
    // browser's copy event.
    copy() {
        const copied = copySelection(this.session, this.codec, COPIED);
        if (copied.kind === 'copied') {
            this.parts.clipboard.keep(copied.text);
        }

        return copied;
    }

    run(): CommandOutcome {
        const copied = this.copy();
        if (copied.kind === 'refused') return copied;

        return { kind: 'done', skipped: copied.skipped };
    }
}
