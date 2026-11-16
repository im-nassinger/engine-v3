import type { SystemClipboard } from './SystemClipboard.ts';

// The editor's side of the clipboard: the last copy's text, kept in memory for the session, and the
// system clipboard when there is one. A paste falls back to the last copy when the system refuses a read.
export class EditorClipboard {
    private readonly system: SystemClipboard | undefined;
    private lastCopyText: string | undefined;

    // Without a system clipboard, copies stay in memory only, as in a test.
    constructor(system?: SystemClipboard) {
        this.system = system;
    }

    get lastCopy() {
        return this.lastCopyText;
    }

    // Keeps the text at once and writes the system clipboard without waiting. A refused write is
    // harmless: the last copy is still pasted from memory.
    keep(text: string) {
        this.lastCopyText = text;
        if (this.system === undefined) return;

        const writing = this.system.writeText(text);
        writing.catch(() => undefined);
    }

    // The system clipboard's text, or the last copy when the read is refused or there is no system
    // clipboard. undefined when nothing was ever copied either.
    async read() {
        if (this.system === undefined) return this.lastCopyText;

        try {
            return await this.system.readText();
        } catch {
            return this.lastCopyText;
        }
    }
}
