// How many bytes the text takes as UTF-8, counted without making the bytes, since a level's text can be
// hundreds of MB. A lone surrogate counts 3 bytes, as TextEncoder writes it as U+FFFD.
export function utf8Length(text: string) {
    let bytes = 0;

    for (let index = 0; index < text.length; index += 1) {
        const code = text.charCodeAt(index);
        if (code < 0x80) {
            bytes += 1;
        } else if (code < 0x800) {
            bytes += 2;
        } else if (isPair(text, index)) {
            bytes += 4;
            index += 1;
        } else {
            bytes += 3;
        }
    }

    return bytes;
}

function isPair(text: string, index: number) {
    const high = text.charCodeAt(index);
    if (high < 0xd800 || high > 0xdbff) return false;

    const low = text.charCodeAt(index + 1);

    return low >= 0xdc00 && low <= 0xdfff;
}

// True when the text is surely no longer than maxBytes, from its length alone: a UTF-16 unit is at most 3 bytes.
export function fitsWithoutCounting(text: string, maxBytes: number) {
    return text.length * 3 <= maxBytes;
}
