import { deleteDB, openDB } from 'idb';
import { afterEach, describe, expect, test } from 'vitest';
import { IndexedDbLevelStore } from './IndexedDbLevelStore.ts';

const databaseNames: string[] = [];
let databaseCount = 0;

function newStore() {
    databaseCount += 1;
    const databaseName = `engine-v3-test-${Date.now()}-${databaseCount}`;
    databaseNames.push(databaseName);

    return { store: new IndexedDbLevelStore(databaseName), databaseName };
}

// Imitates a full disk: the browser refuses the put with a QuotaExceededError, as it would past its quota.
function refusePutsWithQuotaError() {
    const realPut = Object.getOwnPropertyDescriptor(IDBObjectStore.prototype, 'put');

    IDBObjectStore.prototype.put = function refusedPut() {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    };

    return () => {
        if (realPut !== undefined) {
            Object.defineProperty(IDBObjectStore.prototype, 'put', realPut);
        }
    };
}

afterEach(async () => {
    const names = databaseNames.splice(0);

    for (const name of names) {
        await deleteDB(name);
    }
});

describe('IndexedDbLevelStore', () => {
    test('an empty store loads nothing', async () => {
        const { store } = newStore();

        expect(await store.load()).toBeUndefined();
    });

    test('a save and a load round trip, and a second store on the same database reads it', async () => {
        const { store, databaseName } = newStore();
        const level = { levelJson: '{"format":"engine-v3-level"}', savedAtMs: 1_700_000_000_000 };

        const write = await store.save(level);
        const reopened = new IndexedDbLevelStore(databaseName);

        expect(write).toBe('wroteNew');
        expect(await store.load()).toEqual(level);
        expect(await reopened.load()).toEqual(level);
    });

    test('a second save replaces the first and says so', async () => {
        const { store } = newStore();

        await store.save({ levelJson: 'first', savedAtMs: 1 });
        const write = await store.save({ levelJson: 'second', savedAtMs: 2 });

        expect(write).toBe('replaced');
        expect(await store.load()).toEqual({ levelJson: 'second', savedAtMs: 2 });
    });

    test('a failed write rejects and leaves the last save', async () => {
        const { store } = newStore();
        await store.save({ levelJson: 'kept', savedAtMs: 1 });

        const restorePut = refusePutsWithQuotaError();
        let refusal: unknown;
        try {
            await store.save({ levelJson: 'lost', savedAtMs: 2 });
        } catch (error) {
            refusal = error;
        } finally {
            restorePut();
        }

        expect(refusal).toBeInstanceOf(DOMException);
        expect((refusal as DOMException).name).toBe('QuotaExceededError');
        expect(await store.load()).toEqual({ levelJson: 'kept', savedAtMs: 1 });
    });

    test('a save after a failed one works', async () => {
        const { store } = newStore();

        const restorePut = refusePutsWithQuotaError();
        await expect(store.save({ levelJson: 'lost', savedAtMs: 1 })).rejects.toThrow();
        restorePut();
        const write = await store.save({ levelJson: 'saved', savedAtMs: 2 });

        expect(write).toBe('wroteNew');
        expect(await store.load()).toEqual({ levelJson: 'saved', savedAtMs: 2 });
    });

    test('a record of the wrong shape loads as its text, so the reader refuses it and it is kept', async () => {
        const { store, databaseName } = newStore();
        await store.save({ levelJson: 'x', savedAtMs: 1 });
        const request = indexedDB.open(databaseName);
        const database = await new Promise<IDBDatabase>((resolve) => {
            request.onsuccess = () => resolve(request.result);
        });
        const transaction = database.transaction('level', 'readwrite');
        transaction.objectStore('level').put({ other: 5 }, 'level');
        await new Promise((resolve) => (transaction.oncomplete = resolve));
        database.close();

        const loaded = await store.load();

        expect(loaded).toEqual({ levelJson: '{"other":5}', savedAtMs: 0 });
    });

    test('a damaged record is kept beside the level, and a later one replaces it', async () => {
        const { store, databaseName } = newStore();
        await store.save({ levelJson: 'level', savedAtMs: 1 });

        await store.keepDamaged({ levelJson: 'first', savedAtMs: 2, refusal: { reason: 'notALevel' } });
        await store.keepDamaged({ levelJson: 'second', savedAtMs: 3, refusal: { reason: 'damaged', detail: 'x' } });
        const database = await openDB(databaseName);
        const kept: unknown = await database.get('level', 'damaged');
        database.close();

        expect(kept).toEqual({ levelJson: 'second', savedAtMs: 3, refusal: { reason: 'damaged', detail: 'x' } });
        expect(await store.load()).toEqual({ levelJson: 'level', savedAtMs: 1 });
    });
});
