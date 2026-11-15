const LEVEL_VIEW_SELECTOR = '[data-focus-place="level"]';

// Enter and Esc give the keyboard back to the level view, so the next key press reaches the editor.
// Without a level view on the page, the field still lets go of the keyboard.
export function returnKeyboardToLevelView(field: HTMLElement) {
    const levelView = field.ownerDocument.querySelector<HTMLElement>(LEVEL_VIEW_SELECTOR);
    levelView?.focus({ preventScroll: true });

    const stillFocused = field.ownerDocument.activeElement === field;
    if (stillFocused) {
        field.blur();
    }
}
