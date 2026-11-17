import type { Modifiers } from '../Tool.ts';

// The keys held while resizing with a handle or drawing a box, as the resize reads them. Ctrl+Shift together
// means one thing, from the centre, as Alt does: it neither keeps proportions nor turns snapping off.
// Alt stays a second way, so Alt+Shift still resizes from the centre keeping proportions.
export function sizingModifiers(modifiers: Modifiers): Modifiers {
    if (!(modifiers.ctrl && modifiers.shift)) return modifiers;

    return { shift: false, alt: true, ctrl: false };
}
