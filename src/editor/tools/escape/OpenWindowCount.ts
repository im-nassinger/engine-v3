import type { OpenWindows } from './OpenWindows.ts';

// Closes what open() opened. Calling it twice closes it once.
export type CloseWindow = () => void;

// The page's menus and the Entities panel's row drag, each counted while open, so Esc knows one will
// answer it.
export class OpenWindowCount implements OpenWindows {
    private count = 0;

    isOpen() {
        return this.count > 0;
    }

    open(): CloseWindow {
        this.count += 1;
        let closed = false;

        return () => {
            if (closed) return;

            closed = true;
            this.count -= 1;
        };
    }
}
