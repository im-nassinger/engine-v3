import type { TabGuard } from '../contracts/TabGuard.ts';

// A TabGuard for tests: another tab holds the lock when heldElsewhere is set.
export class FakeTabGuard implements TabGuard {
    heldElsewhere: boolean;

    constructor(heldElsewhere = false) {
        this.heldElsewhere = heldElsewhere;
    }

    acquire() {
        return Promise.resolve(!this.heldElsewhere);
    }
}
