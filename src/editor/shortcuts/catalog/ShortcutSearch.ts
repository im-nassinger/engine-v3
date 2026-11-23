import type { ShortcutRow, ShortcutSection } from './ShortcutRow.ts';

// The shortcut list's search: a row shows when every word typed is in its name or its keys, case and
// order not counting, so "ctrl z", "Z ctrl" and "ctrl+z" all find Undo. One character is a key ("z",
// "1", "?") and must be a whole key or a whole word of the name; a longer word may be a key's or a name
// word's start ("back" finds Backspace, "gri" finds Grid). Without that, "ctrl z" would also find Zoom in.
export class ShortcutSearch {
    private readonly searchWords: readonly string[];

    constructor(query: string) {
        this.searchWords = searchWordsOf(query);
    }

    matches(row: ShortcutRow) {
        const nameWords = nameWordsOf(row.name);
        const keyWords = keyWordsOf(row);

        return this.searchWords.every((searchWord) => {
            const inName = wordMatches(searchWord, nameWords);
            const inKeys = wordMatches(searchWord, keyWords);

            return inName || inKeys;
        });
    }

    // The sections with only their matching rows; a section with none left is dropped.
    filter(sections: readonly ShortcutSection[]) {
        const shown: ShortcutSection[] = [];

        for (const section of sections) {
            const rows = section.rows.filter((row) => this.matches(row));
            if (rows.length === 0) continue;

            shown.push({ area: section.area, rows });
        }

        return shown;
    }
}

// Spaces split the words, and so does a '+' with something after it, so "ctrl++" is Ctrl and +.
function searchWordsOf(query: string) {
    const searchWords: string[] = [];
    const typedWords = query.split(/\s+/).filter((word) => word !== '');

    for (const typedWord of typedWords) {
        const keyWords = typedWord.split(/\+(?=.)/);

        for (const keyWord of keyWords) {
            const folded = foldCase(keyWord);
            searchWords.push(folded);
        }
    }

    return searchWords;
}

// "Zoom to 100%" is zoom, to and 100; "Rotate 1°" is rotate and 1.
function nameWordsOf(name: string) {
    const folded = foldCase(name);

    return folded.split(/[^\p{L}\p{N}]+/u).filter((word) => word !== '');
}

// Each key whole, and the words of a key such as "Middle drag" or "Double-click".
function keyWordsOf(row: ShortcutRow) {
    const keyWords: string[] = [];

    for (const keys of row.keys) {
        for (const key of keys) {
            const folded = foldCase(key);
            keyWords.push(folded);

            const parts = folded.split(/[\s-]+/);
            if (parts.length > 1) {
                keyWords.push(...parts);
            }
        }
    }

    return keyWords;
}

function wordMatches(searchWord: string, words: readonly string[]) {
    const isOneCharacter = searchWord.length === 1;

    return words.some((word) => {
        if (word === searchWord) return true;
        if (isOneCharacter) return false;

        return word.startsWith(searchWord);
    });
}

// Lower case without accents, so "bezier" finds the Bézier pen.
function foldCase(text: string) {
    const decomposed = text.normalize('NFD');
    const withoutAccents = decomposed.replace(/\p{M}/gu, '');

    return withoutAccents.toLowerCase();
}
