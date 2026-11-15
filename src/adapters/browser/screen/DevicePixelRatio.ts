import type { Unsubscribe } from '../../../core/events/index.ts';

// The browser's devicePixelRatio, and a call when it changes: browser zoom, or the window moving to
// another screen. A media query on the current ratio stops matching when it changes, so the
// listener moves to a new query each time.
export class DevicePixelRatio {
    current() {
        return window.devicePixelRatio || 1;
    }

    onChange(listener: (ratio: number) => void): Unsubscribe {
        let query: MediaQueryList | undefined;
        let stopped = false;

        const handleChange = () => {
            query?.removeEventListener('change', handleChange);
            if (stopped) return;

            listen();
            listener(this.current());
        };

        const listen = () => {
            query = window.matchMedia(`(resolution: ${this.current()}dppx)`);
            query.addEventListener('change', handleChange);
        };

        listen();

        return () => {
            stopped = true;
            query?.removeEventListener('change', handleChange);
        };
    }
}
