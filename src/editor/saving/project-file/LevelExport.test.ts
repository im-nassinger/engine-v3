import { describe, expect, test } from 'vitest';

import { Level } from '../../../core/level/index.ts';
import { LevelWriter, V1_LEVEL_LIMITS } from '../../../core/level-data/index.ts';
import { EditorSession } from '../../session/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';

import { Autosave } from '../autosave/Autosave.ts';
import { EditorSettings } from '../settings/EditorSettings.ts';
import { FakeFiles } from '../testing/FakeFiles.ts';
import { FakePersistence } from '../testing/FakePersistence.ts';
import { InMemoryLevelStore } from '../testing/InMemoryLevelStore.ts';
import { InMemorySettingsStore } from '../testing/InMemorySettingsStore.ts';
import { StoredZipCodec } from '../testing/StoredZipCodec.ts';

import { LevelExport } from './LevelExport.ts';
import type { SavesNow } from './LevelExport.ts';
import { LEVEL_JSON_PATH, PROJECT_FILE_MEDIA_TYPE, ProjectFile } from './ProjectFile.ts';

function buildExport(saving?: SavesNow) {
    const timer = new ManualTimer();
    const level = Level.createNew();
    const session = new EditorSession({ level, clock: timer.clock, timer, frames: new ManualFrames() });
    const store = new InMemoryLevelStore();
    const writer = new LevelWriter();
    const autosave = new Autosave({
        session,
        store,
        writer,
        timer,
        clock: timer.clock,
        persistence: new FakePersistence(),
        persistAsked: new EditorSettings(new InMemorySettingsStore(), new ManualFrames()).persistAsked,
        limits: V1_LEVEL_LIMITS,
    });
    const files = new FakeFiles();
    const zip = new StoredZipCodec();
    const levelExport = new LevelExport({
        session,
        saving: saving ?? autosave,
        projectFile: new ProjectFile(writer, zip),
        exporter: files,
    });

    // Renames the open level, an undo step, so the level has an unsaved change.
    const rename = (name: string) => {
        session.openLevel.editor.edit('Rename level', () => {
            session.openLevel.level.rename(name);
            return { kind: 'done' };
        });
    };

    return { session, store, writer, zip, autosave, files, levelExport, rename };
}

describe('LevelExport', () => {
    test('saves to the browser first, then hands out the packed level named after it', async () => {
        const { store, writer, zip, autosave, files, levelExport, rename, session } = buildExport();
        rename('A/B: C?');

        const name = await levelExport.run();

        expect(name).toBe('A_B_ C_.editable');
        expect(store.saveCount).toBe(1);
        expect(autosave.state.status).toBe('saved');
        expect(files.exported).toHaveLength(1);
        const file = files.exported[0];
        expect(file?.name).toBe('A_B_ C_.editable');
        expect(file?.mediaType).toBe(PROJECT_FILE_MEDIA_TYPE);
        expect(file !== undefined && 'bytes' in file ? file.bytes : undefined).toBe(zip.answers[0]);
        expect(zip.textAt(LEVEL_JSON_PATH)).toBe(JSON.stringify(writer.write(session.openLevel.level)));
    });

    test('still exports when the save fails', async () => {
        const { store, autosave, files, levelExport, rename } = buildExport();
        store.refusesSaves = true;
        rename('castle');

        await levelExport.run();

        expect(autosave.state.status).toBe('failed');
        expect(files.exported.map((file) => file.name)).toEqual(['castle.editable']);
    });

    test('packs only after the save has finished', async () => {
        const order: string[] = [];
        const saving = {
            saveNow: async () => {
                await Promise.resolve();
                order.push('saved');
            },
        };
        const { files, levelExport } = buildExport(saving);
        const exportFile = files.exportFile.bind(files);
        files.exportFile = (file) => {
            order.push('exported');
            exportFile(file);
        };

        await levelExport.run();

        expect(order).toEqual(['saved', 'exported']);
    });

    test('exports from a read-only tab without saving', async () => {
        const { session, store, files, levelExport } = buildExport();
        session.makeReadOnly();

        await levelExport.run();

        expect(store.saveCount).toBe(0);
        expect(files.exported.map((file) => file.name)).toEqual(['Untitled level.editable']);
    });
});
