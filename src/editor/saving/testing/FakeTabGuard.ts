import type { Acquired, HandOver, TabGuard } from '../contracts/TabGuard.ts';

// A TabGuard for tests: another tab had the level when heldElsewhere is set, and takeOver acts as a newer
// tab taking it.
export class FakeTabGuard implements TabGuard {
    heldElsewhere: boolean;
    private handOver: HandOver | undefined;

    constructor(heldElsewhere = false) {
        this.heldElsewhere = heldElsewhere;
    }

    acquire(): Promise<Acquired> {
        const acquired = this.heldElsewhere ? 'takenOver' : 'free';

        return Promise.resolve(acquired);
    }

    whenTakenOver(handOver: HandOver) {
        this.handOver = handOver;
    }

    async takeOver() {
        await this.handOver?.();
    }
}
