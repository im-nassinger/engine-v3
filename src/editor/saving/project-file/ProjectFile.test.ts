import { describe, expect, test } from 'vitest';

import { Level } from '../../../core/level/index.ts';
import { LevelWriter } from '../../../core/level-data/index.ts';
import { StoredZipCodec } from '../testing/StoredZipCodec.ts';

import { LEVEL_JSON_PATH, ProjectFile } from './ProjectFile.ts';

describe('ProjectFile', () => {
    test('packs one entry, level.json, holding the level as the writer writes it', async () => {
        const level = Level.createNew();
        level.rename('castle');
        const writer = new LevelWriter();
        const zip = new StoredZipCodec();

        const bytes = await new ProjectFile(writer, zip).pack(level);

        expect(zip.packed).toHaveLength(1);
        expect(zip.packed[0]?.map((entry) => entry.path)).toEqual([LEVEL_JSON_PATH]);
        expect(zip.textAt(LEVEL_JSON_PATH)).toBe(JSON.stringify(writer.write(level)));
        expect(bytes).toBe(zip.answers[0]);
    });
});
