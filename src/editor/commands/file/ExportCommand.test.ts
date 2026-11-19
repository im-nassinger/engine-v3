import { describe, expect, test } from 'vitest';

import { Level } from '../../../core/level/index.ts';
import { StoredZipCodec } from '../../saving/testing/index.ts';
import { EditorSession } from '../../session/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { createCommandRegistry } from '../createCommandRegistry.ts';
import { buildFileTestParts, settle } from './testing/fileTestParts.ts';

import { EXPORT_FAILED_TEXT, ExportCommand } from './ExportCommand.ts';

function buildCommand(zip = new StoredZipCodec()) {
    const timer = new ManualTimer();
    const session = new EditorSession({
        level: Level.createNew(),
        clock: timer.clock,
        timer,
        frames: new ManualFrames(),
    });
    const { parts, files } = buildFileTestParts(session, zip);
    const command = new ExportCommand(session, parts);

    return { session, files, command, parts };
}

describe('ExportCommand', () => {
    test('is in the File menu, without a shortcut', () => {
        const { command } = buildCommand();

        expect(command.menu.menu).toBe('File');
        expect(command.shortcuts).toEqual([]);
    });

    test('exports and says which file once it is handed out', async () => {
        const { session, files, command } = buildCommand();

        expect(command.run()).toEqual({ kind: 'done' });
        await settle();

        expect(files.exported.map((file) => file.name)).toEqual(['Untitled level.editable']);
        expect(session.status.current).toBe('Exported Untitled level.editable');
    });

    test('says so when packing fails', async () => {
        const zip = new StoredZipCodec();
        zip.pack = () => Promise.reject(new Error('Out of memory.'));
        const { session, files, command } = buildCommand(zip);

        command.run();
        await settle();

        expect(files.exported).toEqual([]);
        expect(session.status.current).toBe(EXPORT_FAILED_TEXT);
    });

    test('is enabled in a read-only tab', () => {
        const { session, command, parts } = buildCommand();
        session.makeReadOnly();
        const registry = createCommandRegistry(session, undefined, parts);

        expect(command.availability()).toEqual({ enabled: true });
        expect(registry.find('file.export')?.availability()).toEqual({ enabled: true });
    });
});
