import type { EditorSession } from '../../session/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';

import type { FileParts } from './FileParts.ts';

export const EXPORT_FAILED_TEXT = 'Export failed. Try again';

export function exportedText(fileName: string) {
    return `Exported ${fileName}`;
}

// Export and Ctrl+S: saves to the browser, packs the project file and downloads it. Works in a read-only
// tab and with a failed save, since only the browser's storage can fail and Export doesn't need it. The
// export finishes after run returns, so its status text comes when the file is handed out.
export class ExportCommand implements EditorCommand {
    readonly id = 'file.export';
    readonly label = 'Export';
    readonly menu = { menu: 'File', section: 1, order: 30 } as const;
    readonly shortcuts = ['Ctrl+S'];
    readonly shortcutScope = 'everywhere';
    private readonly session: EditorSession;
    private readonly parts: FileParts;

    constructor(session: EditorSession, parts: FileParts) {
        this.session = session;
        this.parts = parts;
    }

    availability(): Availability {
        return { enabled: true };
    }

    run(): CommandOutcome {
        const status = this.session.status;
        this.parts.levelExport.run().then(
            (fileName) => status.show(exportedText(fileName)),
            () => status.show(EXPORT_FAILED_TEXT),
        );

        return { kind: 'done' };
    }
}
