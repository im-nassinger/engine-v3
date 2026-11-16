import type { DamagedOpening, FileExporter } from '../../saving/index.ts';
import type { CommandOutcome } from '../EditorCommand.ts';

export const DAMAGED_TITLE = "Can't open the saved level";
export const EXPORT_RAW_LABEL = 'Export raw data';
export const DAMAGED_FILE_NAME = 'damaged-level.json';

// Shown once as the editor opens on a saved level that wouldn't open: it is kept in the browser either way,
// and Export raw data hands its text out as it was saved. Close changes nothing.
export function damagedLevelQuestion(damaged: DamagedOpening, exporter: FileExporter): CommandOutcome {
    const exportRaw = (): CommandOutcome => {
        exporter.exportFile({ name: DAMAGED_FILE_NAME, text: damaged.levelJson, mediaType: 'application/json' });

        return { kind: 'done', text: `Exported ${DAMAGED_FILE_NAME}` };
    };

    const question = {
        title: DAMAGED_TITLE,
        text: damaged.noticeText,
        confirmLabel: EXPORT_RAW_LABEL,
        cancelLabel: 'Close',
    };

    return { kind: 'needsConfirmation', question, confirm: exportRaw };
}
