import { VersionCounter } from '../../core/events/index.ts';

// Whether the shortcut list's sheet is open: `?`, Help › Keyboard shortcuts, its × and Esc change it. It
// stays open while the level is edited, and is never saved: a reload starts with it closed.
export class ShortcutSheetState {
    readonly version = new VersionCounter();
    private open = false;

    get isOpen() {
        return this.open;
    }

    toggle() {
        this.set(!this.open);
    }

    // False when it was already closed, so Esc goes on to its next answer.
    close() {
        if (!this.open) return false;

        this.set(false);
        return true;
    }

    private set(open: boolean) {
        this.open = open;
        this.version.increment();
    }
}
