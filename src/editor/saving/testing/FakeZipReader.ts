import type { Unpacked, ZipDirectoryEntry, ZipReader } from '../contracts/ZipReader.ts';

export type FakeZipFile = {
    readonly path: string;
    readonly text: string;
    // What the directory claims; the text's length when not given.
    readonly declaredBytes?: number;
    // Left out of what unpacking gives, as a file whose data is cut short.
    readonly broken?: boolean;
};

// A ZipReader for tests in editor, which may not import the real one from adapters: the bytes it is given
// are ignored, and it answers with the files it was built with. Each file's bytes are a new empty array
// that decodeText knows, and text counts one byte a character.
export class FakeZipReader implements ZipReader {
    private readonly files: readonly FakeZipFile[] | undefined;
    private readonly texts = new WeakMap<Uint8Array, string>();
    readonly unpackedLimits: number[] = [];

    // No files: the bytes aren't a zip.
    constructor(files: readonly FakeZipFile[] | undefined) {
        this.files = files;
    }

    readDirectory(): readonly ZipDirectoryEntry[] | undefined {
        return this.files?.map((file) => ({ path: file.path, declaredBytes: file.declaredBytes ?? file.text.length }));
    }

    unpack(_bytes: Uint8Array, maxBytes: number): Unpacked {
        this.unpackedLimits.push(maxBytes);
        if (this.files === undefined) return { ok: false, reason: 'damaged' };

        const entries = new Map<string, Uint8Array>();
        let count = 0;
        for (const file of this.files) {
            count += file.text.length;
            if (count > maxBytes) return { ok: false, reason: 'tooBig' };
            if (file.broken === true) continue;

            const bytes = new Uint8Array(0);
            this.texts.set(bytes, file.text);
            entries.set(file.path, bytes);
        }

        return { ok: true, entries };
    }

    decodeText(bytes: Uint8Array) {
        return this.texts.get(bytes);
    }
}
