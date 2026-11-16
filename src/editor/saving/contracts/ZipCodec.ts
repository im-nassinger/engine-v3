// One file inside a zip: its path, with forward slashes, and its data. Text is written as UTF-8, by the
// codec, since the editor has no TextEncoder.
export type ZipEntry = {
    readonly path: string;
    readonly data: Uint8Array | string;
};

// Makes the project file's zip: FflateZipCodec in the page and in the adapter's tests, since it is pure.
// Reading a zip joins it with the import worker.
export type ZipCodec = {
    pack(entries: readonly ZipEntry[]): Promise<Uint8Array>;
};
