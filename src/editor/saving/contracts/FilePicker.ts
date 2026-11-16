// A file the user chose or dropped: its name, for the status text, and its bytes, read only when needed.
export type PickedFile = {
    readonly name: string;
    read(): Promise<ArrayBuffer>;
};

// Lets the user choose a project file: BrowserFilePicker in the page. Undefined when they cancel. It must be
// called while the browser still counts the user's click, so before anything awaits.
export type FilePicker = {
    pickFile(): Promise<PickedFile | undefined>;
};
