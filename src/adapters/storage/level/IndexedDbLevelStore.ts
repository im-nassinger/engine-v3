import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { LevelStore, SavedLevel, SaveWrite } from '../../../editor/saving/index.ts';

const DATABASE_VERSION = 1;
const LEVEL_RECORD_KEY = 'level';

type LevelDatabase = DBSchema & {
    level: {
        key: string;
        value: unknown;
    };
};

// The record is read as unknown because anything can be in the browser's storage. A record of the wrong shape is
// given back with its whole text as level.json, so the reader refuses it as damaged and its data is kept.
function toSavedLevel(record: unknown): SavedLevel {
    if (typeof record === 'object' && record !== null && 'levelJson' in record && 'savedAtMs' in record) {
        const { levelJson, savedAtMs } = record;

        if (typeof levelJson === 'string' && typeof savedAtMs === 'number') {
            return { levelJson, savedAtMs };
        }
    }

    const recordText = JSON.stringify(record) ?? String(record);

    return { levelJson: recordText, savedAtMs: 0 };
}

// The level in IndexedDB through idb: one record in the store `level`, written in one transaction with strict
// durability, so a save fully replaces the last one or leaves it as it was.
export class IndexedDbLevelStore implements LevelStore {
    static readonly defaultDatabaseName = 'engine-v3';

    private readonly databaseName: string;
    private database: Promise<IDBPDatabase<LevelDatabase>> | undefined;

    constructor(databaseName = IndexedDbLevelStore.defaultDatabaseName) {
        this.databaseName = databaseName;
    }

    async load() {
        const database = await this.open();
        const record = await database.get('level', LEVEL_RECORD_KEY);
        if (record === undefined) return undefined;

        return toSavedLevel(record);
    }

    async save(level: SavedLevel): Promise<SaveWrite> {
        const database = await this.open();
        const transaction = database.transaction('level', 'readwrite', { durability: 'strict' });
        const transactionDone = transaction.done;
        // A put that fails aborts the transaction, and its rejection is the one reported.
        transactionDone.catch(() => undefined);

        try {
            const existingKey = await transaction.store.getKey(LEVEL_RECORD_KEY);
            const record: SavedLevel = { levelJson: level.levelJson, savedAtMs: level.savedAtMs };
            await transaction.store.put(record, LEVEL_RECORD_KEY);
            await transactionDone;

            if (existingKey === undefined) return 'wroteNew';

            return 'replaced';
        } catch (error) {
            abortQuietly(transaction);
            throw error;
        }
    }

    // Opened on first use and kept. A failed opening, or a database the browser closed, is opened again next time,
    // so the retry after a failed save can work once storage is back.
    private open() {
        if (this.database !== undefined) return this.database;

        const opening = openDB<LevelDatabase>(this.databaseName, DATABASE_VERSION, {
            upgrade(database) {
                database.createObjectStore('level');
            },
            blocking: (_currentVersion, _blockedVersion, event) => {
                const database = event.target as IDBDatabase;
                database.close();
                this.database = undefined;
            },
            terminated: () => {
                this.database = undefined;
            },
        });
        this.database = opening;

        opening.catch(() => {
            if (this.database === opening) {
                this.database = undefined;
            }
        });

        return opening;
    }
}

function abortQuietly(transaction: { abort(): void }) {
    try {
        transaction.abort();
    } catch {
        // Already finished or aborted by the failed request.
    }
}
