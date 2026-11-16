import type { ExportedFile, FileExporter } from '../../../editor/saving/index.ts';

// Long enough for every browser to have started reading the file before its URL is freed.
const REVOKE_AFTER_MS = 60_000;

// Hands a file out by downloading it: a Blob behind an object URL, clicked through a link with the
// download attribute, which needs no permission and works in every browser.
export class FileDownload implements FileExporter {
    private readonly page: Window;

    constructor(page: Window) {
        this.page = page;
    }

    exportFile(file: ExportedFile) {
        // A copy into a plain ArrayBuffer, since a Blob refuses a view of shared memory.
        const blob = new Blob([new Uint8Array(file.bytes)], { type: file.mediaType });
        const url = URL.createObjectURL(blob);
        const link = this.page.document.createElement('a');
        link.href = url;
        link.download = file.name;
        link.style.display = 'none';

        this.page.document.body.append(link);
        link.click();
        link.remove();
        this.page.setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
    }
}
