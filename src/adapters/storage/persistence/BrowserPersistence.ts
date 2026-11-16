import type { StoragePersistence } from '../../../editor/saving/index.ts';

type StorageManagerSource = () => Pick<StorageManager, 'persist'> | undefined;

function browserStorageManager() {
    return navigator.storage as StorageManager | undefined;
}

// Asks the browser to keep the saved level when it runs low on space. A browser without the API, or one that
// fails the request, counts as having said no.
export class BrowserPersistence implements StoragePersistence {
    private readonly storageManager: StorageManagerSource;

    constructor(storageManager: StorageManagerSource = browserStorageManager) {
        this.storageManager = storageManager;
    }

    async persist() {
        try {
            const storageManager = this.storageManager();
            if (storageManager === undefined) return false;

            return await storageManager.persist();
        } catch {
            return false;
        }
    }
}
