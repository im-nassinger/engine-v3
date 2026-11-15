import { VersionCounter } from '../../../core/events/index.ts';
import type { EntityId } from '../../../core/level/index.ts';

// The Rename command's ask for the Entities panel to open one row's name box. The command can't reach
// the panel, so it leaves the ask here; the panel follows the version, opens the box and clears the ask.
export class RenameRequest {
    // Moves when the ask is made or cleared.
    readonly version = new VersionCounter();
    private requestedId: EntityId | undefined;

    // undefined when nothing waits to be renamed.
    get entityId() {
        return this.requestedId;
    }

    request(id: EntityId) {
        this.requestedId = id;
        this.version.increment();
    }

    // The panel calls it once the box is open, so the same ask doesn't open it twice.
    clear() {
        if (this.requestedId === undefined) return;

        this.requestedId = undefined;
        this.version.increment();
    }
}
