// Asks the browser to keep the saved level when it runs low on space: navigator.storage.persist() in the page.
// Resolves whether the browser agreed. Never rejects.
export type StoragePersistence = {
    persist(): Promise<boolean>;
};
