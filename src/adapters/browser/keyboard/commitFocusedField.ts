// Commits the field being typed in by taking the keyboard away from it: every typed field commits when
// it loses focus. For Play, so the run starts from what is on screen.
export function commitFocusedField(page: Document) {
    const focused = page.activeElement;
    if (!(focused instanceof HTMLElement)) return;

    focused.blur();
}
