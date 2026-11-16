// One file a zip's directory declares, read without unpacking it. The size is what the directory claims,
// which a zip bomb lies about, so it is checked again while unpacking.
export type ZipDirectoryEntry = {
    readonly path: string;
    readonly declaredBytes: number;
};

export type Unpacked =
    | { readonly ok: true; readonly entries: ReadonlyMap<string, Uint8Array> }
    | { readonly ok: false; readonly reason: 'tooBig' | 'damaged' };

// Reads a project file's zip: FflateZipReader in the import worker and in the adapter's tests.
export type ZipReader = {
    // The directory, or undefined when the bytes aren't a zip.
    readDirectory(bytes: Uint8Array): readonly ZipDirectoryEntry[] | undefined;
    // Unpacks every file whose data is whole, counting the unpacked bytes as they come and stopping the
    // moment the count passes maxBytes, whatever the directory said. Damaged when the data can't be unpacked.
    unpack(bytes: Uint8Array, maxBytes: number): Unpacked;
    // UTF-8 bytes as text, or undefined when they aren't UTF-8, since the editor has no TextDecoder.
    decodeText(bytes: Uint8Array): string | undefined;
};
