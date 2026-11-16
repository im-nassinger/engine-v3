import type { Unsubscribe } from '../../../core/events/index.ts';
import type { SaveIndicator, SavesNow, SessionOpenRecord } from '../../../editor/saving/index.ts';

export type PageSavingParts = {
    readonly indicator: SaveIndicator;
    readonly saving: SavesNow;
    // Settings written on the next frame, which a hidden tab never runs.
    readonly settings: { flush(): void };
    // Only the tab with the lock keeps it: a read-only tab closing would hide the other tab's crash.
    readonly sessionOpen: SessionOpenRecord | undefined;
};

// The page's events that saving answers: the tab hidden saves at once, since a hidden tab may be closed
// or killed without another event; leaving the page clears sessionOpen, so the next opening knows it was
// no crash; and the leave prompt is armed only while the level has unsaved changes, since an always-on
// beforeunload listener stops some browsers keeping the page in their back-forward cache.
export class PageSavingEvents {
    private readonly parts: PageSavingParts;
    private readonly page: Window;
    private isPromptArmed = false;
    private readonly handleBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();

    constructor(parts: PageSavingParts, page: Window) {
        this.parts = parts;
        this.page = page;
    }

    connect(): Unsubscribe {
        const handleVisibility = () => this.handleVisibility();
        const handlePageHide = () => this.handlePageHide();
        const handlePageShow = (event: PageTransitionEvent) => this.handlePageShow(event);

        this.page.document.addEventListener('visibilitychange', handleVisibility);
        this.page.addEventListener('pagehide', handlePageHide);
        this.page.addEventListener('pageshow', handlePageShow);
        const stopState = this.parts.indicator.version.subscribe(() => this.armPrompt());
        this.armPrompt();

        return () => {
            this.page.document.removeEventListener('visibilitychange', handleVisibility);
            this.page.removeEventListener('pagehide', handlePageHide);
            this.page.removeEventListener('pageshow', handlePageShow);
            stopState();
            this.setPromptArmed(false);
        };
    }

    private handleVisibility() {
        if (this.page.document.visibilityState !== 'hidden') return;

        this.saveAtOnce();
    }

    private handlePageHide() {
        this.saveAtOnce();
        this.parts.sessionOpen?.setOpen(false);
    }

    // Back from the back-forward cache: the session is open again, so a crash from here on is noticed.
    private handlePageShow(event: PageTransitionEvent) {
        if (!event.persisted) return;

        this.parts.sessionOpen?.setOpen(true);
    }

    private saveAtOnce() {
        this.parts.settings.flush();
        void this.parts.saving.saveNow();
    }

    private armPrompt() {
        this.setPromptArmed(this.parts.indicator.hasUnsavedChanges);
    }

    private setPromptArmed(armed: boolean) {
        if (armed === this.isPromptArmed) return;

        this.isPromptArmed = armed;
        if (armed) {
            this.page.addEventListener('beforeunload', this.handleBeforeUnload);
        } else {
            this.page.removeEventListener('beforeunload', this.handleBeforeUnload);
        }
    }
}
