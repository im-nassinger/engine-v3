import type { ExportedFile, FileExporter } from '../contracts/FileExporter.ts';

// A FileExporter for tests: keeps every exported file in order.
export class FakeFiles implements FileExporter {
    readonly exported: ExportedFile[] = [];

    exportFile(file: ExportedFile) {
        this.exported.push(file);
    }
}
