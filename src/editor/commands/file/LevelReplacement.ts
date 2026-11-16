import type { Level } from '../../../core/level/index.ts';
import { importRefusalText } from '../../saving/index.ts';
import type { PickedFile } from '../../saving/index.ts';
import type { EditorSession } from '../../session/index.ts';
import type { CommandOutcome } from '../EditorCommand.ts';
import { fitView } from '../view/fitView.ts';

import type { FileParts } from './FileParts.ts';

export const REPLACE_QUESTION_TEXT = 'Replace the open level? Export it first if you want to keep it.';
export const REPLACE_LABEL = 'Replace';
export const IMPORT_REFUSED_TITLE = "Can't import";

export function importingText(fileName: string) {
    return `Importing ${fileName}`;
}

export function importedText(fileName: string) {
    return `Imported ${fileName}`;
}

// What New, Import and dropping a file share: the question before the open level is replaced, and the
// replacing itself, all or nothing. The new level starts a fresh history, is saved at once and is shown
// fitted to its camera frame.
export class LevelReplacement {
    private readonly session: EditorSession;
    private readonly parts: FileParts;

    constructor(session: EditorSession, parts: FileParts) {
        this.session = session;
        this.parts = parts;
    }

    // Asked every time, even over an empty level, as the requirement says.
    ask(title: string, replace: () => CommandOutcome): CommandOutcome {
        const question = { title, text: REPLACE_QUESTION_TEXT, confirmLabel: REPLACE_LABEL };

        return { kind: 'needsConfirmation', question, confirm: replace };
    }

    replace(level: Level) {
        this.session.replaceOpenLevel(level);
        this.fitCameraFrame();
        void this.parts.saving.saveNow();
    }

    // A refused file changes nothing and gets its plain message in a notice.
    async importFile(file: PickedFile) {
        this.session.status.show(importingText(file.name));

        const outcome = await this.parts.levelImport.read(file);
        if (!outcome.ok) {
            const text = importRefusalText(outcome.refusal);
            this.parts.outcomes.showOutcome({ kind: 'notice', notice: { title: IMPORT_REFUSED_TITLE, text } });
            return;
        }

        this.replace(outcome.value);
        this.session.status.show(importedText(file.name));
    }

    private fitCameraFrame() {
        const { level, caches } = this.session.openLevel;
        const frame = caches.bounds.ownBoundsOf(level.camera);
        if (frame === undefined) return;

        fitView(this.session.view, frame);
    }
}
