import { afterEach, describe, expect, test } from 'vitest';

import { Level } from '../../../core/level/index.ts';
import { LevelWriter } from '../../../core/level-data/index.ts';
import { CommandRunner, createCommandRegistry, FileDropEvents } from '../../../editor/commands/index.ts';
import { LevelExport, LevelImport, ProjectFile } from '../../../editor/saving/index.ts';
import { FakeFileImporter, FakeFilePicker, FakeFiles, StoredZipCodec } from '../../../editor/saving/testing/index.ts';
import { EditorSession } from '../../../editor/session/index.ts';
import { ManualFrames, ManualTimer } from '../../../editor/time/testing/index.ts';

import { FileDropTarget } from './FileDropTarget.ts';

const disconnects: (() => void)[] = [];

afterEach(() => {
    for (const disconnect of disconnects.splice(0)) {
        disconnect();
    }
});

function buildEditor() {
    const timer = new ManualTimer();
    const session = new EditorSession({
        level: Level.createNew(),
        clock: timer.clock,
        timer,
        frames: new ManualFrames(),
    });
    const runner = new CommandRunner(session.status);
    const importer = new FakeFileImporter();
    const saving = { saveNow: () => Promise.resolve() };
    const levelExport = new LevelExport({
        session,
        saving,
        projectFile: new ProjectFile(new LevelWriter(), new StoredZipCodec()),
        exporter: new FakeFiles(),
    });
    const levelImport = new LevelImport({ importer, reader: session.reader });
    const parts = { levelExport, levelImport, picker: new FakeFilePicker(), saving, outcomes: runner };
    const registry = createCommandRegistry(session, undefined, parts);
    const target = new FileDropTarget(new FileDropEvents(registry, runner), window);
    disconnects.push(target.connect());

    return { session, runner, importer };
}

function dataTransferWith(file: File | undefined) {
    const transfer = new DataTransfer();
    if (file !== undefined) {
        transfer.items.add(file);
    }

    return transfer;
}

function dispatchDrag(type: 'dragover' | 'drop', dataTransfer: DataTransfer) {
    const event = new DragEvent(type, { dataTransfer, bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);

    return event;
}

function importedLevelData() {
    const level = Level.createNew();
    level.rename('Castle');

    return new LevelWriter().write(level);
}

// Lets the import's promises run.
async function settle() {
    for (let turn = 0; turn < 10; turn += 1) {
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
}

describe('FileDropTarget', () => {
    test('a drag carrying a file is taken as a copy, so the browser does not open it', () => {
        buildEditor();
        const file = new File(['PK'], 'castle.editable');

        const event = dispatchDrag('dragover', dataTransferWith(file));

        expect(event.defaultPrevented).toBe(true);
    });

    test('a drag of text is left to the browser', () => {
        buildEditor();
        const transfer = new DataTransfer();
        transfer.setData('text/plain', 'hello');

        const event = dispatchDrag('drop', transfer);

        expect(event.defaultPrevented).toBe(false);
    });

    test('dropping a file asks, then imports', async () => {
        const { session, runner, importer } = buildEditor();
        importer.answer = { ok: true, value: importedLevelData() };
        const file = new File([new Uint8Array([80, 75, 3, 4])], 'castle.editable');

        const event = dispatchDrag('drop', dataTransferWith(file));
        expect(event.defaultPrevented).toBe(true);
        expect(runner.dialog.current?.kind).toBe('question');
        expect(importer.importedCount).toBe(0);

        runner.confirmDialog();
        await settle();

        expect(importer.importedCount).toBe(1);
        expect(session.openLevel.level.name).toBe('Castle');
        expect(session.status.current).toBe('Imported castle.editable');
    });
});
