import type { ToolKey } from '../Tool.ts';

// The letter a key stands for, read as the shortcuts read it: what the layout types, or the physical key when
// the layout types no Latin letter there. Upper case, or undefined for a key that is no letter.
export function typedLetter(key: ToolKey) {
    if (/^[a-z]$/i.test(key.key)) return key.key.toUpperCase();

    return /^Key([A-Z])$/.exec(key.code)?.[1];
}
