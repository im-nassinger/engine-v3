import { strToU8, zipSync } from 'fflate';
import { describe, expect, test } from 'vitest';

import { FflateZipCodec } from '../adapters/zip/index.ts';
import { ImportWorkerClient } from '../adapters/worker/index.ts';
import { Level } from '../core/level/index.ts';
import { LevelWriter } from '../core/level-data/index.ts';
import { ProjectFile } from '../editor/saving/index.ts';

import { createImportWorker } from './createImportWorker.ts';

const importer = new ImportWorkerClient(createImportWorker);

describe('the import worker', () => {
    test('answers a real project file with its level', async () => {
        const level = Level.createNew();
        level.rename('castle');
        const writer = new LevelWriter();
        const packed = await new ProjectFile(writer, new FflateZipCodec()).pack(level);

        const outcome = await importer.importFile(packed.slice().buffer);

        expect(outcome).toEqual({ ok: true, value: writer.write(level) });
    });

    test('refuses a file that is not a level', async () => {
        const notALevel = zipSync({ 'notes.txt': strToU8('hello') });

        const outcome = await importer.importFile(notALevel.slice().buffer);

        expect(outcome).toEqual({ ok: false, refusal: { reason: 'notALevel' } });
    });
});
