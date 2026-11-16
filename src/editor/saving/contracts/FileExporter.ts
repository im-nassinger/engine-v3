// A file the editor hands out of the browser: its name with the extension, its bytes or its text, and its
// media type. Text is written as UTF-8 by the adapter, since the editor has no TextEncoder.
export type ExportedFile = {
    readonly name: string;
    readonly mediaType: string;
} & ({ readonly bytes: Uint8Array } | { readonly text: string });

// Gives a file to the user: FileDownload in the page, which starts a download.
export type FileExporter = {
    exportFile(file: ExportedFile): void;
};
