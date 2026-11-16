// A file the editor hands out of the browser: its name with the extension, its bytes and its media type.
export type ExportedFile = {
    readonly name: string;
    readonly bytes: Uint8Array;
    readonly mediaType: string;
};

// Gives a file to the user: FileDownload in the page, which starts a download.
export type FileExporter = {
    exportFile(file: ExportedFile): void;
};
