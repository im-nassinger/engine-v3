import type { Unsubscribe } from '../../core/events/index.ts';

export type Versioned = {
    readonly version: number;
    subscribe(listener: () => void): Unsubscribe;
};
