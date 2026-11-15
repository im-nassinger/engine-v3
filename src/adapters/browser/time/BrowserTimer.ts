import type { Cancel, Timer } from '../../../editor/time/index.ts';

// The browser's setTimeout behind the editor's Timer contract.
export class BrowserTimer implements Timer {
    after(delayMs: number, callback: () => void): Cancel {
        const handle = window.setTimeout(callback, delayMs);

        return () => window.clearTimeout(handle);
    }
}
