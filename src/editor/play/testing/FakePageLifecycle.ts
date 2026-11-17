import type { Unsubscribe } from '../../../core/events/index.ts';

import type { PageChange, PageLifecycle } from '../inputs/PageLifecycle.ts';

// A page that changes only when a test says so.
export class FakePageLifecycle implements PageLifecycle {
    private readonly listeners = new Set<(change: PageChange) => void>();

    get listenerCount() {
        return this.listeners.size;
    }

    subscribe(listener: (change: PageChange) => void): Unsubscribe {
        this.listeners.add(listener);

        return () => {
            this.listeners.delete(listener);
        };
    }

    change(change: PageChange) {
        this.listeners.forEach((listener) => listener(change));
    }
}
