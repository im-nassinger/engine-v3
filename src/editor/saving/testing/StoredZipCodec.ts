import type { ZipCodec, ZipEntry } from '../contracts/ZipCodec.ts';

// A ZipCodec for tests in editor, which may not import the real one from adapters: keeps the entries of each
// pack and the bytes it answered with, a new array each time.
export class StoredZipCodec implements ZipCodec {
    readonly packed: (readonly ZipEntry[])[] = [];
    readonly answers: Uint8Array[] = [];

    pack(entries: readonly ZipEntry[]) {
        const answer = new Uint8Array([this.answers.length]);
        this.packed.push(entries);
        this.answers.push(answer);

        return Promise.resolve(answer);
    }

    // The text of the last pack's entry at path.
    textAt(path: string) {
        const entry = this.packed.at(-1)?.find((candidate) => candidate.path === path);
        if (typeof entry?.data !== 'string') throw new Error(`No text entry at ${path}.`);

        return entry.data;
    }
}
