import type { CommandOutcome } from '../EditorCommand.ts';

export const HANDED_OVER_TITLE = 'Opened in another tab';
export const HANDED_OVER_SAVED_TEXT =
    'The level is open in a newer tab, so this tab is read-only now. Your changes were saved first. Reload this tab to edit here instead.';
export const HANDED_OVER_UNSAVED_TEXT =
    "The level is open in a newer tab, so this tab is read-only now. Your last changes couldn't be saved in this browser, but Export still works. Reload this tab to edit here instead.";

// Shown in the older tab once a newer tab has taken the level, so its read-only state is never a surprise.
export function handedOverNotice(isSaved: boolean): CommandOutcome {
    const text = isSaved ? HANDED_OVER_SAVED_TEXT : HANDED_OVER_UNSAVED_TEXT;

    return { kind: 'notice', notice: { title: HANDED_OVER_TITLE, text } };
}
