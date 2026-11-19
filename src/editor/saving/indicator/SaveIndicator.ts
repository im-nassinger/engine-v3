import { READ_ONLY_REASON } from '../../history/index.ts';

import { SAVE_FAILED_TEXT } from '../autosave/Autosave.ts';
import type { Autosave } from '../autosave/Autosave.ts';
import { SaveState } from '../autosave/SaveState.ts';
import type { Opening } from '../opening/LevelOpener.ts';

// autosave: Autosave saves the level. readOnly: another tab holds the lock. nothingSaved: storage can't
// open, or a damaged record couldn't be kept apart, so this tab never saves.
export type SaveMode = 'autosave' | 'readOnly' | 'nothingSaved';

// The save state's words, and what clicking it explains.
export type SaveStateShown = {
    readonly label: string;
    readonly explanation: string;
};

export const SAVED_EXPLANATION =
    'Saved in this browser. The browser may delete its data, so only an exported file is a real backup';
export const SAVING_EXPLANATION = 'The level is being saved in this browser';
export const UNSAVED_EXPLANATION =
    'The level changed since its last save. It saves itself 2 seconds after your last change';
export const NOTHING_SAVED_EXPLANATION = 'Nothing will be saved in this browser. Export still works';
export const READ_ONLY_LABEL = 'Read-only';

type SaveIndicatorParts = {
    readonly state: SaveState;
    readonly mode: SaveMode;
    // Why the last save failed, while it stands: Autosave's level-wide message.
    readonly failureText: () => string | undefined;
};

// What the page shows of saving: the save state, the message pill's failed save, the tab title's `*` and
// the leave prompt.
// A read-only tab shows `Read-only` and never counts as unsaved, since leaving it loses nothing.
export class SaveIndicator {
    readonly state: SaveState;
    readonly mode: SaveMode;
    private readonly failureText: () => string | undefined;

    constructor(parts: SaveIndicatorParts) {
        this.state = parts.state;
        this.mode = parts.mode;
        this.failureText = parts.failureText;
    }

    // Autosave's state when the opening can save; otherwise one that never changes.
    static forOpening(opening: Opening, autosave: Autosave | undefined) {
        if (autosave !== undefined) {
            return new SaveIndicator({
                state: autosave.state,
                mode: 'autosave',
                failureText: () => autosave.failureText,
            });
        }

        const mode = opening.readOnly ? 'readOnly' : 'nothingSaved';
        const state = new SaveState();
        if (mode === 'nothingSaved') {
            state.set('failed');
        }

        return new SaveIndicator({ state, mode, failureText: () => undefined });
    }

    get version() {
        return this.state.version;
    }

    // Nothing saved counts as unsaved for good: leaving the tab loses the level.
    get hasUnsavedChanges() {
        if (this.mode === 'readOnly') return false;

        return !this.state.isSaved;
    }

    // For the message pill, until the save is fixed. A tab that never saves keeps it for good.
    get failedSaveText() {
        if (this.state.status !== 'failed') return undefined;

        return this.shown.explanation;
    }

    get shown(): SaveStateShown {
        if (this.mode === 'readOnly') return { label: READ_ONLY_LABEL, explanation: READ_ONLY_REASON };
        if (this.mode === 'nothingSaved') return { label: 'Save failed', explanation: NOTHING_SAVED_EXPLANATION };

        switch (this.state.status) {
            case 'saved':
                return { label: 'Saved', explanation: SAVED_EXPLANATION };
            case 'saving':
                return { label: 'Saving', explanation: SAVING_EXPLANATION };
            case 'unsaved':
                return { label: 'Unsaved changes', explanation: UNSAVED_EXPLANATION };
            case 'failed':
                return { label: 'Save failed', explanation: this.failureText() ?? SAVE_FAILED_TEXT };
        }
    }
}
