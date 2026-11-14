import type { Unsubscribe } from './Unsubscribe.ts';

type Subscription<Payload> = {
    readonly listener: (payload: Payload) => void;
};

export class Signal<Payload> {
    // Each subscription is its own object, so one function subscribed twice is two subscriptions.
    private readonly subscriptions = new Set<Subscription<Payload>>();

    subscribe(listener: (payload: Payload) => void): Unsubscribe {
        const subscription = { listener };
        this.subscriptions.add(subscription);

        return () => {
            this.subscriptions.delete(subscription);
        };
    }

    emit(payload: Payload) {
        // A snapshot, so a listener added during an emit waits for the next one.
        const subscriptionsAtEmit = [...this.subscriptions];

        for (const subscription of subscriptionsAtEmit) {
            const wasRemovedDuringEmit = !this.subscriptions.has(subscription);
            if (wasRemovedDuringEmit) continue;

            subscription.listener(payload);
        }
    }
}
