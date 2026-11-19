import { VersionCounter } from '../../../core/events/index.ts';

// saved: the browser holds the open level as it is. unsaved: it changed since. saving: a save is being
// written. failed: the last save didn't work, and the level is kept only in this tab.
export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'failed';

// What the tab title's `*`, the message pill's failed save and the leave prompt follow.
export class SaveState {
    readonly version = new VersionCounter();
    private current: SaveStatus = 'saved';

    get status() {
        return this.current;
    }

    get isSaved() {
        return this.current === 'saved';
    }

    set(status: SaveStatus) {
        if (this.current === status) return;

        this.current = status;
        this.version.increment();
    }
}
