import { READ_ONLY_REASON } from '../../history/index.ts';
import type { PickedFile } from '../../saving/index.ts';
import type { EditorSession } from '../../session/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';

import type { FileParts } from './FileParts.ts';
import { LevelReplacement } from './LevelReplacement.ts';

const IMPORT_TITLE = 'Import';

// Import and Ctrl+O: asks, then lets the user choose a project file, which the import worker checks before
// anything changes. A dropped file is asked about the same way. It checks for a read-only tab itself
// instead of being wrapped in ReadOnlyGuard, because dropping a file calls importDropped directly.
export class ImportCommand implements EditorCommand {
    readonly id = 'file.import';
    readonly label = 'Import';
    readonly menu = { menu: 'File', section: 1, order: 20 } as const;
    readonly shortcuts = ['Ctrl+O'];
    private readonly session: EditorSession;
    private readonly parts: FileParts;
    private readonly replacement: LevelReplacement;

    constructor(session: EditorSession, parts: FileParts) {
        this.session = session;
        this.parts = parts;
        this.replacement = new LevelReplacement(session, parts);
    }

    availability(): Availability {
        if (this.session.readOnly) return { enabled: false, reason: READ_ONLY_REASON };

        return { enabled: true };
    }

    run(): CommandOutcome {
        if (this.session.readOnly) return { kind: 'refused', reason: READ_ONLY_REASON };

        return this.replacement.ask(IMPORT_TITLE, () => this.pickAndImport());
    }

    importDropped(file: PickedFile): CommandOutcome {
        if (this.session.readOnly) return { kind: 'refused', reason: READ_ONLY_REASON };

        return this.replacement.ask(IMPORT_TITLE, () => this.importLater(file));
    }

    // The picker opens inside the Replace button's click, which the browser needs before it shows one.
    private pickAndImport(): CommandOutcome {
        const picking = this.parts.picker.pickFile();
        void picking.then((file) => {
            if (file === undefined) return;

            return this.replacement.importFile(file);
        });

        return { kind: 'done' };
    }

    private importLater(file: PickedFile): CommandOutcome {
        void this.replacement.importFile(file);

        return { kind: 'done' };
    }
}
