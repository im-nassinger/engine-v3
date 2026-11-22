// The longest tag, variable name or input name: long enough for `enemy_flying_boss`, short enough for a menu.
export const MAX_WORD_NAME_LENGTH = 32;

const WHITESPACE = /\s+/gu;
const NOT_A_WORD_CHARACTER = /[^a-z0-9_]/gu;

// A tag, a variable's name or an input's name: one word of lowercase letters, digits and `_`. What is typed
// is made lowercase, its spaces become `_`, other characters are dropped, and it is cut at 32 characters.
// Empty when nothing is left, which the caller refuses or drops.
export function wordName(typed: string) {
    const lowercase = typed.trim().toLowerCase();
    const joined = lowercase.replace(WHITESPACE, '_');
    const word = joined.replace(NOT_A_WORD_CHARACTER, '');

    return word.slice(0, MAX_WORD_NAME_LENGTH);
}
