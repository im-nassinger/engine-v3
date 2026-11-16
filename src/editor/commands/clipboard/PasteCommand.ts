import { LevelWriter } from '../../../core/level-data/index.ts';
import { ClipboardCodec, IdRemapping, PastePlacement } from '../../clipboard/index.ts';
import type { EditOutcome } from '../../history/index.ts';
import type { EditorSession } from '../../session/index.ts';
import { outcomeText } from '../../status/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';

import type { ClipboardParts } from './ClipboardParts.ts';
import { pasteEntities } from './pasteEntities.ts';
import type { PasteSpot, PasteTools } from './pasteEntities.ts';
import { pasteRefusalText } from './pasteRefusalText.ts';

const NOTHING_TO_PASTE = 'Nothing to paste';

// Pastes the clipboard's entities centred on the mouse over the level view, else on the view's middle.
// From the menu the read is asynchronous: run() starts it, and the paste happens when the text arrives,
// with its outcome shown in the status bar then.
export class PasteCommand implements EditorCommand {
    readonly id = 'edit.paste';
    readonly label = 'Paste';
    readonly menu = { menu: 'Edit', section: 2, order: 30 } as const;
    readonly shortcuts = ['Ctrl+V'];
    private readonly session: EditorSession;
    private readonly parts: ClipboardParts;
    private readonly codec: ClipboardCodec;
    private readonly tools: PasteTools;

    constructor(session: EditorSession, parts: ClipboardParts) {
        this.session = session;
        this.parts = parts;

        const writer = new LevelWriter();
        this.codec = new ClipboardCodec(writer);
        this.tools = { reader: session.reader, writer, remapping: new IdRemapping(session.registry) };
    }

    // Whether there is something to paste is only known once the clipboard is read.
    availability(): Availability {
        return { enabled: true };
    }

    run(): CommandOutcome {
        void this.readAndPaste();

        return { kind: 'done' };
    }

    // Reads the system clipboard, or the last copy when the read is refused, and pastes it.
    async readAndPaste() {
        const text = await this.parts.clipboard.read();
        const outcome = this.pasteText(text);
        const statusText = outcomeText(outcome);
        if (statusText === undefined) return;

        this.session.status.show(statusText);
    }

    // Pastes the text at once: the browser's paste event carries it. Plain text and other JSON are
    // "Nothing to paste".
    pasteText(text: string | undefined): EditOutcome {
        if (text === undefined) return { kind: 'refused', reason: NOTHING_TO_PASTE };

        const decoded = this.codec.decode(text);
        if (decoded.kind === 'notOurs') return { kind: 'refused', reason: NOTHING_TO_PASTE };
        if (decoded.kind === 'refused') return { kind: 'refused', reason: pasteRefusalText(decoded.refusal) };

        const spot = this.pasteSpot();

        return pasteEntities(this.session.openLevel, this.tools, decoded.fragment, spot);
    }

    private pasteSpot(): PasteSpot {
        const { view, viewSettings } = this.session;
        const destination = PastePlacement.destinationOf(this.parts.mouse.current, view.middle);

        let gridSize: number | undefined;
        if (viewSettings.isOn('gridSnapping')) {
            gridSize = this.session.openLevel.level.editorData.gridSize;
        }

        return { destination, gridSize };
    }
}
