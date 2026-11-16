import { unzipSync } from 'fflate';
import { describe, expect, test } from 'vitest';

import { Level } from '../../core/level/index.ts';
import { LevelWriter } from '../../core/level-data/index.ts';
import { LEVEL_JSON_PATH, ProjectFile } from '../../editor/saving/index.ts';

import { FflateZipCodec } from './FflateZipCodec.ts';

describe('FflateZipCodec', () => {
    test('a packed level unzips to the same level.json', async () => {
        const level = Level.createNew();
        level.rename('Château');
        const writer = new LevelWriter();

        const packed = await new ProjectFile(writer, new FflateZipCodec()).pack(level);
        const unpacked = unzipSync(packed);

        expect(Object.keys(unpacked)).toEqual([LEVEL_JSON_PATH]);
        const text = new TextDecoder().decode(unpacked[LEVEL_JSON_PATH]);
        expect(text).toBe(JSON.stringify(writer.write(level)));
    });

    test('keeps every entry under its path', async () => {
        const entries = [
            { path: 'level.json', data: '{}' },
            { path: 'files/images/dot.png', data: new Uint8Array([137, 80, 78, 71]) },
        ];

        const unpacked = unzipSync(await new FflateZipCodec().pack(entries));

        expect(Object.keys(unpacked).sort()).toEqual(['files/images/dot.png', 'level.json']);
        expect(unpacked['files/images/dot.png']).toEqual(new Uint8Array([137, 80, 78, 71]));
        expect(new TextDecoder().decode(unpacked['level.json'])).toBe('{}');
    });
});
