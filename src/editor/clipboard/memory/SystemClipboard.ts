// The system clipboard as the menu entries reach it: the browser's asynchronous clipboard API in the page.
// readText rejects when the browser refuses the read.
export type SystemClipboard = {
    writeText(text: string): Promise<void>;
    readText(): Promise<string>;
};
