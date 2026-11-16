import type { Unsubscribe } from '../../../core/events/index.ts';
import type { ClipboardEvents } from '../../../editor/commands/index.ts';
import { focusPlaceOf } from '../keyboard/focusPlaceOf.ts';

type ClipboardHandler = Pick<ClipboardEvents, 'copy' | 'cut' | 'paste'>;

const TEXT_TYPE = 'text/plain';

// The page's cut, copy and paste events, which the keys send without asking permission: outside text
// fields they run the editor's Cut, Copy and Paste with the event's own data, and the browser's default
// is stopped. In a text field or the code editor they stay the browser's. Listens on the window in the
// capture phase, like KeyboardInput.
export class ClipboardBridge {
    private readonly handler: ClipboardHandler;
    private readonly page: Window;

    constructor(handler: ClipboardHandler, page: Window) {
        this.handler = handler;
        this.page = page;
    }

    connect(): Unsubscribe {
        const options = { capture: true };
        const handleCopy = (event: ClipboardEvent) => this.handleCopyOrCut(event, () => this.handler.copy());
        const handleCut = (event: ClipboardEvent) => this.handleCopyOrCut(event, () => this.handler.cut());
        const handlePaste = (event: ClipboardEvent) => this.handlePaste(event);

        this.page.addEventListener('copy', handleCopy, options);
        this.page.addEventListener('cut', handleCut, options);
        this.page.addEventListener('paste', handlePaste, options);

        return () => {
            this.page.removeEventListener('copy', handleCopy, options);
            this.page.removeEventListener('cut', handleCut, options);
            this.page.removeEventListener('paste', handlePaste, options);
        };
    }

    // Without clipboardData the copy still reaches the editor's memory and the asynchronous clipboard.
    private handleCopyOrCut(event: ClipboardEvent, copy: () => string | undefined) {
        if (this.isTyping()) return;

        const text = copy();
        if (text === undefined) return;

        event.clipboardData?.setData(TEXT_TYPE, text);
        event.preventDefault();
    }

    private handlePaste(event: ClipboardEvent) {
        if (this.isTyping()) return;

        const text = event.clipboardData?.getData(TEXT_TYPE) ?? '';
        const pasted = this.handler.paste(text);
        if (pasted) {
            event.preventDefault();
        }
    }

    private isTyping() {
        const focus = focusPlaceOf(this.page.document.activeElement);

        return focus === 'textField' || focus === 'codeEditor';
    }
}
