import type { FocusPlace } from '../../../editor/shortcuts/index.ts';

// Inputs that take a click or a choice rather than typing, so the editor's letter keys still work there.
const NON_TEXT_INPUT_TYPES = new Set([
    'button',
    'checkbox',
    'color',
    'file',
    'image',
    'radio',
    'range',
    'reset',
    'submit',
]);

// Where the keyboard is, read from the focused element: the code editor (v2) wins, since it types into
// a textarea of its own; then any field that takes typing; then the nearest data-focus-place. Focus on
// nothing (the page itself) counts as a panel.
export function focusPlaceOf(focused: Element | null): FocusPlace {
    if (focused === null) return 'panel';

    const placeElement = focused.closest('[data-focus-place]');
    const markedPlace = placeElement?.getAttribute('data-focus-place');

    if (markedPlace === 'codeEditor') return 'codeEditor';
    if (takesTyping(focused)) return 'textField';
    if (markedPlace === 'level') return 'level';

    return 'panel';
}

function takesTyping(element: Element) {
    if (element instanceof HTMLTextAreaElement) return true;
    if (element instanceof HTMLSelectElement) return true;
    if (element instanceof HTMLInputElement) return !NON_TEXT_INPUT_TYPES.has(element.type);
    if (element instanceof HTMLElement) return element.isContentEditable;

    return false;
}
