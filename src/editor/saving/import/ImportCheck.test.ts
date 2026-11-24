import { describe, expect, test } from 'vitest';

import { createV1Registry, NameComponent, TransformComponent } from '../../../core/components/index.ts';
import { Level } from '../../../core/level/index.ts';
import { FormatUpgrader, LevelReader, LevelWriter, V1_LEVEL_LIMITS } from '../../../core/level-data/index.ts';
import type { LevelLimits } from '../../../core/level-data/index.ts';

import { LEVEL_JSON_PATH } from '../project-file/ProjectFile.ts';
import { FakeZipReader } from '../testing/FakeZipReader.ts';
import type { FakeZipFile } from '../testing/FakeZipReader.ts';
import { ImportCheck } from './ImportCheck.ts';

const writer = new LevelWriter();
const BYTES = new Uint8Array(0);

function castle() {
    const level = Level.createNew();
    level.rename('castle');
    for (const name of ['Tower', 'Wall']) {
        const entity = level.createEntity(level.world, level.world.children.length);
        entity.addComponent(new TransformComponent());
        entity.addComponent(new NameComponent({ name }));
    }

    return level;
}

const castleJson = JSON.stringify(writer.write(castle()));

function check(files: readonly FakeZipFile[] | undefined, limits: LevelLimits = V1_LEVEL_LIMITS) {
    const reader = new LevelReader(createV1Registry(), limits, FormatUpgrader.createCurrent());
    const zip = new FakeZipReader(files);

    return { outcome: new ImportCheck({ zip, reader, writer, limits }).check(BYTES), zip };
}

const smallLimits: LevelLimits = { ...V1_LEVEL_LIMITS, maxBytes: castleJson.length + 10 };

describe('ImportCheck', () => {
    test('answers with the level as the writer writes it', () => {
        const { outcome } = check([{ path: LEVEL_JSON_PATH, text: castleJson }]);

        expect(outcome).toEqual({ ok: true, value: writer.write(castle()) });
    });

    test('other files next to level.json are allowed', () => {
        const { outcome } = check([
            { path: 'files/images/dot.png', text: 'png' },
            { path: LEVEL_JSON_PATH, text: castleJson },
        ]);

        expect(outcome.ok).toBe(true);
    });

    test('bytes that are not a zip are not a level', () => {
        expect(check(undefined).outcome).toEqual({ ok: false, refusal: { reason: 'notALevel' } });
    });

    test('a zip without level.json is not a level, and is not unpacked', () => {
        const { outcome, zip } = check([{ path: 'notes.txt', text: 'hello' }]);

        expect(outcome).toEqual({ ok: false, refusal: { reason: 'notALevel' } });
        expect(zip.unpackedLimits).toEqual([]);
    });

    test('a directory declaring more than the limit is too big, and is not unpacked', () => {
        const { outcome, zip } = check(
            [
                { path: LEVEL_JSON_PATH, text: castleJson },
                { path: 'files/big.bin', text: '', declaredBytes: 20 },
            ],
            smallLimits,
        );

        expect(outcome).toEqual({
            ok: false,
            refusal: { reason: 'overLimit', limit: 'size', max: smallLimits.maxBytes },
        });
        expect(zip.unpackedLimits).toEqual([]);
    });

    test('a zip bomb whose directory lies is stopped by the running count', () => {
        const { outcome, zip } = check(
            [
                { path: LEVEL_JSON_PATH, text: castleJson, declaredBytes: 1 },
                { path: 'files/bomb.bin', text: 'x'.repeat(100), declaredBytes: 1 },
            ],
            smallLimits,
        );

        expect(outcome).toEqual({
            ok: false,
            refusal: { reason: 'overLimit', limit: 'size', max: smallLimits.maxBytes },
        });
        expect(zip.unpackedLimits).toEqual([smallLimits.maxBytes]);
    });

    test('level.json cut short is damaged', () => {
        const { outcome } = check([{ path: LEVEL_JSON_PATH, text: castleJson, broken: true }]);

        expect(outcome).toEqual({
            ok: false,
            refusal: { reason: 'damaged', detail: 'level.json could not be unpacked' },
        });
    });

    test('level.json that is not JSON is damaged', () => {
        const { outcome } = check([{ path: LEVEL_JSON_PATH, text: '{"format": ' }]);

        expect(outcome).toEqual({ ok: false, refusal: { reason: 'damaged', detail: 'level.json is not JSON' } });
    });

    test('JSON that is not a level is not a level', () => {
        const { outcome } = check([{ path: LEVEL_JSON_PATH, text: '{"hello": 1}' }]);

        expect(outcome).toEqual({ ok: false, refusal: { reason: 'notALevel' } });
    });

    test('a level with a broken value is damaged, as the reader says', () => {
        const data = writer.write(castle());
        const broken = { ...data, editor: { ...data.editor, gridSize: 'big' } };
        const { outcome } = check([{ path: LEVEL_JSON_PATH, text: JSON.stringify(broken) }]);

        expect(outcome.ok).toBe(false);
        expect(!outcome.ok && outcome.refusal.reason).toBe('damaged');
    });

    test('a level from a newer version is refused with its version', () => {
        const newer = { ...writer.write(castle()), formatVersion: 99 };
        const { outcome } = check([{ path: LEVEL_JSON_PATH, text: JSON.stringify(newer) }]);

        expect(outcome).toEqual({ ok: false, refusal: { reason: 'newerVersion', fileVersion: 99 } });
    });

    test('a level over a limit names the limit', () => {
        const limits: LevelLimits = { ...V1_LEVEL_LIMITS, maxEntities: 2 };
        const { outcome } = check([{ path: LEVEL_JSON_PATH, text: castleJson }], limits);

        expect(outcome).toEqual({ ok: false, refusal: { reason: 'overLimit', limit: 'entities', max: 2 } });
    });
});
