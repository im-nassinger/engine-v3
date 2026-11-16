import type { EditorSession } from '../../session/index.ts';
import type { FileExporter } from '../contracts/FileExporter.ts';

import type { ProjectFile } from './ProjectFile.ts';
import { PROJECT_FILE_MEDIA_TYPE } from './ProjectFile.ts';
import { projectFileName } from './projectFileName.ts';

// What Export needs from Autosave: a save of anything unsaved, resolving when it is written or failed.
export type SavesNow = {
    saveNow(): Promise<void>;
};

export type LevelExportOptions = {
    readonly session: EditorSession;
    readonly saving: SavesNow;
    readonly projectFile: ProjectFile;
    readonly exporter: FileExporter;
};

// Export and Ctrl+S: save to the browser first, as the requirement says, then pack the open level and hand
// it out, even when the save failed, because Export must work with a full disk.
export class LevelExport {
    private readonly session: EditorSession;
    private readonly saving: SavesNow;
    private readonly projectFile: ProjectFile;
    private readonly exporter: FileExporter;

    constructor(options: LevelExportOptions) {
        this.session = options.session;
        this.saving = options.saving;
        this.projectFile = options.projectFile;
        this.exporter = options.exporter;
    }

    // Resolves with the file's name once it is handed out.
    async run(): Promise<string> {
        await this.saving.saveNow();

        const level = this.session.openLevel.level;
        const name = projectFileName(level.name);
        const bytes = await this.projectFile.pack(level);
        this.exporter.exportFile({ name, bytes, mediaType: PROJECT_FILE_MEDIA_TYPE });

        return name;
    }
}
