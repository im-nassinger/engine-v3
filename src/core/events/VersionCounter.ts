import { Signal } from './Signal.ts';
import type { Unsubscribe } from './Unsubscribe.ts';

export class VersionCounter {
    private currentVersion = 0;
    private readonly incremented = new Signal<void>();

    get version() {
        return this.currentVersion;
    }

    increment() {
        this.currentVersion += 1;
        this.incremented.emit();
    }

    subscribe(listener: () => void): Unsubscribe {
        return this.incremented.subscribe(listener);
    }
}
