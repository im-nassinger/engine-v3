import { deleteDB } from 'idb';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { IndexedDbLevelStore } from '../../src/adapters/storage/index.ts';
import { ImportWorkerClient } from '../../src/adapters/worker/index.ts';
import { FflateZipCodec } from '../../src/adapters/zip/index.ts';
import { createImportWorker } from '../../src/app/createImportWorker.ts';
import { createV1Registry, TransformComponent } from '../../src/core/components/index.ts';
import type { Level } from '../../src/core/level/index.ts';
import {
    FormatUpgrader,
    LevelReader,
    LevelText,
    LevelWriter,
    V1_LEVEL_LIMITS,
} from '../../src/core/level-data/index.ts';
import { LevelImport, ProjectFile } from '../../src/editor/saving/index.ts';
import { buildTestLevel } from '../levels/generator/buildTestLevel.ts';
import { timeMs } from './testing/levelViewPage.ts';

// performance.md: a level holds 100,000 entities, and its load, save, export and import are timed with no
// target. A save at 10,000 took over 50 ms on the owner's laptop, so saving only what changed is built:
// a save after a change is timed against the 50 ms, the first one, which writes everything, is printed.
const SAVE_COUNT = 10_000;
// A drag as the Select tool's speed test drags: 1,000 entities moved in one change.
const MOVED_COUNT = 1_000;
const SAVE_TIME_LIMIT_MS = 50;
// performance.md: CI only catches a large slowdown, since its machines are slower.
const LARGE_SLOWDOWN = 5;
// Each part is timed a few times, since the first run also pays for the browser compiling the code.
const RUNS = 3;
// The World and the camera are counted in the level's entities.
const BUILT_BESIDES = 2;

const databaseName = `engine-v3-performance-${Date.now()}`;
const store = new IndexedDbLevelStore(databaseName);
const writer = new LevelWriter();
const reader = new LevelReader(createV1Registry(), V1_LEVEL_LIMITS, FormatUpgrader.createCurrent());
const projectFile = new ProjectFile(writer, new FflateZipCodec());
const levelImport = new LevelImport({ importer: new ImportWorkerClient(createImportWorker), reader });

afterAll(() => deleteDB(databaseName));

type Timed<T> = { readonly value: T; readonly ms: number };

async function timeAsync<T>(work: () => Promise<T>): Promise<Timed<T>> {
    const start = performance.now();
    const value = await work();

    return { value, ms: performance.now() - start };
}

// A save as Autosave ran it before saving only what changed: level.json's text written whole on the page,
// then put in IndexedDB. Writing the text is the part that holds the page; the put runs mostly in the
// browser's own storage.
function save(level: Level) {
    return saveText(() => JSON.stringify(writer.write(level)));
}

async function saveText(write: () => string) {
    let levelJson = '';
    const textMs = timeMs(() => {
        levelJson = write();
    });
    const { ms } = await timeAsync(() => store.save({ levelJson, savedAtMs: Date.now() }));

    return { textMs, totalMs: textMs + ms, levelJson };
}

// A load as LevelOpener runs it: the saved record from IndexedDB, read as an import is.
async function load() {
    return timeAsync(async () => {
        const saved = await store.load();
        if (saved === undefined) throw new Error('The level was saved before it is loaded.');

        return reader.readJson(saved.levelJson);
    });
}

// An import as the page runs it: the file's bytes checked in a new import worker, then read into a Level.
function importFile(bytes: Uint8Array) {
    const file = { name: 'level.editable', read: () => Promise.resolve(bytes.slice().buffer) };

    return timeAsync(() => levelImport.read(file));
}

function shown(times: readonly number[]) {
    return times.map((ms) => `${ms.toFixed(0)} ms`).join(', ');
}

describe('a level of 100,000 entities', () => {
    const entityCount = V1_LEVEL_LIMITS.maxEntities;
    let level: Level;

    beforeAll(() => {
        level = buildTestLevel(entityCount - BUILT_BESIDES).level;
    });

    test('is saved, loaded, exported and imported, each one timed', async () => {
        const saveTimes: number[] = [];
        const textTimes: number[] = [];
        let levelJson = '';
        for (let run = 0; run < RUNS; run += 1) {
            const saved = await save(level);
            saveTimes.push(saved.totalMs);
            textTimes.push(saved.textMs);
            levelJson = saved.levelJson;
        }

        const loadTimes: number[] = [];
        for (let run = 0; run < RUNS; run += 1) {
            const loaded = await load();
            loadTimes.push(loaded.ms);
            expect(loaded.value).toMatchObject({ ok: true });
        }

        const exportTimes: number[] = [];
        let packed: Uint8Array = new Uint8Array();
        for (let run = 0; run < RUNS; run += 1) {
            const exported = await timeAsync(() => projectFile.pack(level));
            exportTimes.push(exported.ms);
            packed = exported.value;
        }

        const importTimes: number[] = [];
        for (let run = 0; run < RUNS; run += 1) {
            const imported = await importFile(packed);
            importTimes.push(imported.ms);
            if (!imported.value.ok) throw new Error(`The import was refused: ${imported.value.refusal.reason}`);
            expect(writer.write(imported.value.value)).toEqual(writer.write(level));
        }

        const megabytes = (bytes: number) => (bytes / 1_000_000).toFixed(1);
        console.info(
            [
                `A level of ${entityCount} entities, level.json ${megabytes(levelJson.length)} MB, the project file ${megabytes(packed.byteLength)} MB:`,
                `  save ${shown(saveTimes)} (writing level.json's text ${shown(textTimes)})`,
                `  load ${shown(loadTimes)}`,
                `  export ${shown(exportTimes)}`,
                `  import ${shown(importTimes)}`,
            ].join('\n'),
        );
    });

    test('one entity more is refused, saved or imported', async () => {
        const overLevel = buildTestLevel(entityCount - BUILT_BESIDES + 1).level;
        const overLimit = { reason: 'overLimit', limit: 'entities', max: entityCount };

        const loaded = reader.readJson(JSON.stringify(writer.write(overLevel)));
        const imported = await importFile(await projectFile.pack(overLevel));

        expect(loaded).toEqual({ ok: false, refusal: overLimit });
        expect(imported.value).toEqual({ ok: false, refusal: overLimit });
    });
});

describe('a level of 10,000 entities', () => {
    test('is saved after a change within 50 ms, writing again only what changed', async () => {
        const { level, looseCrates } = buildTestLevel(SAVE_COUNT - BUILT_BESIDES);
        const text = new LevelText(level, writer);
        const first = await saveText(() => text.text());

        const changedTimes: number[] = [];
        const changedTextTimes: number[] = [];
        for (let run = 0; run < RUNS; run += 1) {
            const crate = looseCrates[run]!;
            crate.requireComponent(TransformComponent).set('position', { x: run, y: run });
            const saved = await saveText(() => text.text());
            changedTimes.push(saved.totalMs);
            changedTextTimes.push(saved.textMs);
            expect(saved.levelJson).toBe(JSON.stringify(writer.write(level)));
        }

        const movedTimes: number[] = [];
        for (let run = 0; run < RUNS; run += 1) {
            for (const crate of looseCrates.slice(0, MOVED_COUNT)) {
                crate.requireComponent(TransformComponent).set('position', { x: run + 1, y: 0 });
            }
            const saved = await saveText(() => text.text());
            movedTimes.push(saved.totalMs);
            expect(saved.levelJson).toBe(JSON.stringify(writer.write(level)));
        }

        const fullTimes: number[] = [];
        for (let run = 0; run < RUNS; run += 1) {
            fullTimes.push((await save(level)).totalMs);
        }
        text.dispose();

        const fastest = Math.min(...changedTimes);
        console.info(
            [
                `A level of ${SAVE_COUNT} entities:`,
                `  the first save ${shown([first.totalMs])} (writing level.json's text ${shown([first.textMs])})`,
                `  a save after one entity changed ${shown(changedTimes)} (the text ${shown(changedTextTimes)}; target ${SAVE_TIME_LIMIT_MS} ms)`,
                `  a save after ${MOVED_COUNT} entities moved ${shown(movedTimes)}`,
                `  a whole write, as before saving only what changed, ${shown(fullTimes)}`,
            ].join('\n'),
        );
        expect(fastest).toBeLessThan(LARGE_SLOWDOWN * SAVE_TIME_LIMIT_MS);
    });
});
