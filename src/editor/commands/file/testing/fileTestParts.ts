import { LevelWriter } from '../../../../core/level-data/index.ts';
import { LevelExport, LevelImport, ProjectFile } from '../../../saving/index.ts';
import type { ZipCodec } from '../../../saving/index.ts';
import { FakeFileImporter, FakeFilePicker, FakeFiles, StoredZipCodec } from '../../../saving/testing/index.ts';
import type { EditorSession } from '../../../session/index.ts';
import type { CommandOutcome } from '../../EditorCommand.ts';
import type { FileParts } from '../FileParts.ts';

// The File menu's parts on fakes: a store-less save that counts its calls, a picker giving castle.editable,
// an importer answering "not a level" until a test sets its answer, and every late outcome kept in order.
export function buildFileTestParts(session: EditorSession, zip: ZipCodec = new StoredZipCodec()) {
    const files = new FakeFiles();
    const picker = new FakeFilePicker();
    const importer = new FakeFileImporter();
    const lateOutcomes: CommandOutcome[] = [];
    const saving = {
        saveCount: 0,
        saveNow() {
            saving.saveCount += 1;

            return Promise.resolve();
        },
    };
    const levelExport = new LevelExport({
        session,
        saving,
        projectFile: new ProjectFile(new LevelWriter(), zip),
        exporter: files,
    });
    const levelImport = new LevelImport({ importer, reader: session.reader });
    const outcomes = { showOutcome: (outcome: CommandOutcome) => lateOutcomes.push(outcome) };
    const parts: FileParts = { levelExport, levelImport, picker, saving, outcomes };

    return { parts, files, picker, importer, saving, lateOutcomes, levelExport };
}

// Lets an export's or an import's promises run.
export async function settle() {
    for (let turn = 0; turn < 10; turn += 1) {
        await Promise.resolve();
    }
}
