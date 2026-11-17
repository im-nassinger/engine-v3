import type { Unsubscribe } from '../../../core/events/index.ts';
import type { PageChange, PageLifecycle } from '../../../editor/play/index.ts';

// The page's own events for test play: visibilitychange to hidden, and the window's own blur. An
// element losing focus also reaches a window listener, so only a blur aimed at the window counts.
export class PageVisibility implements PageLifecycle {
    private readonly page: Window;

    constructor(page: Window) {
        this.page = page;
    }

    subscribe(listener: (change: PageChange) => void): Unsubscribe {
        const handleVisibility = () => {
            if (this.page.document.visibilityState !== 'hidden') return;

            listener('hidden');
        };
        const handleBlur = (event: FocusEvent) => {
            if (event.target !== this.page) return;

            listener('focusLost');
        };

        this.page.document.addEventListener('visibilitychange', handleVisibility);
        this.page.addEventListener('blur', handleBlur);

        return () => {
            this.page.document.removeEventListener('visibilitychange', handleVisibility);
            this.page.removeEventListener('blur', handleBlur);
        };
    }
}
