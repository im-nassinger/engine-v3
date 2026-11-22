import { VersionCounter } from '../../../core/events/index.ts';

import { SAVE_FAILED_TEXT } from '../autosave/Autosave.ts';
import type { Autosave } from '../autosave/Autosave.ts';
import { SaveState } from '../autosave/SaveState.ts';

// autosave: Autosave saves the level. readOnly: a newer tab took the level. nothingSaved: storage can't
// open, or a damaged record couldn't be kept apart, so this tab never saves.
export type SaveMode = 'autosave' | 'readOnly' | 'nothingSaved';

export const NOTHING_SAVED_WARNING = 'Nothing will be saved in this browser. Export still works';

type SaveIndicatorParts = {
    readonly state: SaveState;
    readonly mode: SaveMode;
    // Why the last save failed, while it stands: Autosave's level-wide message.
    readonly failureText: () => string | undefined;
};

// What the page shows of saving: the message pill's failed save, the tab title's `*` and the leave prompt.
// A read-only tab never counts as unsaved, since leaving it loses nothing.
export class SaveIndicator {
    readonly state: SaveState;
    // Changes with the state, and when the tab becomes read-only.
    readonly version = new VersionCounter();
    private currentMode: SaveMode;
    private readonly failureText: () => string | undefined;

    // Lives as long as the page, so it never stops following the state.
    constructor(parts: SaveIndicatorParts) {
        this.state = parts.state;
        this.currentMode = parts.mode;
        this.failureText = parts.failureText;
        this.state.version.subscribe(() => this.version.increment());
    }

    // Autosave's state when the opening can save; otherwise failed for good.
    static forOpening(autosave: Autosave | undefined) {
        if (autosave !== undefined) {
            return new SaveIndicator({
                state: autosave.state,
                mode: 'autosave',
                failureText: () => autosave.failureText,
            });
        }

        const state = new SaveState();
        state.set('failed');

        return new SaveIndicator({ state, mode: 'nothingSaved', failureText: () => undefined });
    }

    get mode() {
        return this.currentMode;
    }

    // A newer tab took the level: leaving this one loses nothing from here on.
    becomeReadOnly() {
        if (this.currentMode === 'readOnly') return;

        this.currentMode = 'readOnly';
        this.version.increment();
    }

    // Nothing saved counts as unsaved for good: leaving the tab loses the level.
    get hasUnsavedChanges() {
        if (this.mode === 'readOnly') return false;

        return !this.state.isSaved;
    }

    // For the message pill, until the save is fixed. A tab that never saves keeps it for good.
    get failedSaveText() {
        if (this.currentMode === 'readOnly') return undefined;
        if (this.state.status !== 'failed') return undefined;
        if (this.mode === 'nothingSaved') return NOTHING_SAVED_WARNING;

        return this.failureText() ?? SAVE_FAILED_TEXT;
    }
}
