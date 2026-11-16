import { VersionCounter } from '../../core/events/index.ts';

// Why every edit is refused in a tab without the level's lock, as the status bar shows it.
export const READ_ONLY_REASON = 'The level is open in another tab';

// Whether this tab may change the level. Shared by the session with every level it opens, so New and
// Import stay read-only. Only ever turned on: a tab that lost the lock never gets it back in v1.
export class ReadOnlyMode {
    readonly changed = new VersionCounter();
    private on = false;

    get isOn() {
        return this.on;
    }

    turnOn() {
        if (this.on) return;

        this.on = true;
        this.changed.increment();
    }
}
