import { strToU8, zipSync } from 'fflate';
import { describe, expect, test } from 'vitest';

import { createV1Registry } from '../../core/components/index.ts';
import { Level } from '../../core/level/index.ts';
import { FormatUpgrader, LevelReader, LevelWriter, V1_LEVEL_LIMITS } from '../../core/level-data/index.ts';
import { ImportCheck, LEVEL_JSON_PATH } from '../../editor/saving/index.ts';

import { FflateZipReader } from './FflateZipReader.ts';

const MB = 1024 * 1024;
const zipReader = new FflateZipReader();

// Writes size into every place a zip states the unpacked size of each file: the local headers and the
// central directory, as a zip bomb does.
function lieAboutSizes(zip: Uint8Array, size: number) {
    const lying = zip.slice();
    const view = new DataView(lying.buffer);
    for (let at = 0; at + 4 <= lying.length; at++) {
        const signature = view.getUint32(at, true);
        if (signature === 0x04034b50) {
            view.setUint32(at + 22, size, true);
        }
        if (signature === 0x02014b50) {
            view.setUint32(at + 24, size, true);
        }
    }

    return lying;
}

describe('FflateZipReader', () => {
    test('reads the directory without unpacking', () => {
        const zip = zipSync({ 'level.json': strToU8('{}'), 'files/a.bin': new Uint8Array(1000) });

        expect(zipReader.readDirectory(zip)).toEqual([
            { path: 'level.json', declaredBytes: 2 },
            { path: 'files/a.bin', declaredBytes: 1000 },
        ]);
    });

    test('bytes that are not a zip have no directory', () => {
        expect(zipReader.readDirectory(strToU8('{"format": "engine-v3-level"}'))).toBeUndefined();
        expect(zipReader.readDirectory(new Uint8Array(0))).toBeUndefined();
    });

    test('unpacks every file', () => {
        const zip = zipSync({ 'level.json': strToU8('{"a": "Château"}'), 'b/c.bin': new Uint8Array([1, 2, 3]) });

        const unpacked = zipReader.unpack(zip, MB);

        expect(unpacked.ok).toBe(true);
        if (!unpacked.ok) return;
        expect(zipReader.decodeText(unpacked.entries.get('level.json') ?? new Uint8Array())).toBe('{"a": "Château"}');
        expect(unpacked.entries.get('b/c.bin')).toEqual(new Uint8Array([1, 2, 3]));
    });

    test('stops the moment the count passes the limit', () => {
        const zip = zipSync({ 'a.bin': new Uint8Array(600_000), 'b.bin': new Uint8Array(600_000) });

        expect(zipReader.unpack(zip, MB)).toEqual({ ok: false, reason: 'tooBig' });
    });

    test('a file whose data is damaged gives damaged', () => {
        const zip = zipSync({ 'level.json': strToU8('x'.repeat(10_000)) });
        const header = 30 + 'level.json'.length;
        const broken = zip.slice();
        broken.fill(0xff, header, header + 8);

        expect(zipReader.unpack(broken, MB)).toEqual({ ok: false, reason: 'damaged' });
    });

    test('text that is not UTF-8 decodes to undefined', () => {
        expect(zipReader.decodeText(new Uint8Array([0xc3, 0x28]))).toBeUndefined();
    });

    test('a zip bomb whose directory lies is stopped at 256 MB', { timeout: 60_000 }, () => {
        const bomb = lieAboutSizes(zipSync({ [LEVEL_JSON_PATH]: new Uint8Array(300 * MB) }, { level: 1 }), 1000);
        const reader = new LevelReader(createV1Registry(), V1_LEVEL_LIMITS, FormatUpgrader.createCurrent());
        const check = new ImportCheck({ zip: zipReader, reader, writer: new LevelWriter(), limits: V1_LEVEL_LIMITS });

        expect(zipReader.readDirectory(bomb)).toEqual([{ path: LEVEL_JSON_PATH, declaredBytes: 1000 }]);
        expect(check.check(bomb)).toEqual({
            ok: false,
            refusal: { reason: 'overLimit', limit: 'size', max: V1_LEVEL_LIMITS.maxBytes },
        });
    });

    test('a real project file passes ImportCheck', () => {
        const level = Level.createNew();
        level.rename('castle');
        const writer = new LevelWriter();
        const zip = zipSync({ [LEVEL_JSON_PATH]: strToU8(JSON.stringify(writer.write(level))) });
        const reader = new LevelReader(createV1Registry(), V1_LEVEL_LIMITS, FormatUpgrader.createCurrent());

        const outcome = new ImportCheck({ zip: zipReader, reader, writer, limits: V1_LEVEL_LIMITS }).check(zip);

        expect(outcome).toEqual({ ok: true, value: writer.write(level) });
    });
});
