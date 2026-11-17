import type { Unsubscribe } from '../../../core/events/index.ts';

// hidden: the tab was switched away or the window minimised. focusLost: the window lost the keyboard,
// and the key ups will go elsewhere.
export type PageChange = 'hidden' | 'focusLost';

// What the page tells test play about itself.
export type PageLifecycle = {
    subscribe(listener: (change: PageChange) => void): Unsubscribe;
};
