import type { SettingsStore } from '../../../editor/saving/index.ts';

// Reaching window.localStorage itself throws where the browser blocks site data, so it is reached inside the try.
type StorageSource = () => Pick<Storage, 'getItem' | 'setItem'>;

function browserLocalStorage() {
    return window.localStorage;
}

// The editor settings' one JSON text in localStorage. Every read and write is wrapped: a storage that throws reads
// as nothing saved, and a write it refuses is lost, so the settings fall back to their defaults.
export class LocalStorageSettings implements SettingsStore {
    static readonly defaultKey = 'engine-v3/settings';

    private readonly storage: StorageSource;
    private readonly key: string;

    constructor(options: { storage?: StorageSource; key?: string } = {}) {
        this.storage = options.storage ?? browserLocalStorage;
        this.key = options.key ?? LocalStorageSettings.defaultKey;
    }

    read() {
        try {
            const storage = this.storage();
            const text = storage.getItem(this.key);
            if (text === null) return undefined;

            return text;
        } catch {
            return undefined;
        }
    }

    write(text: string) {
        try {
            const storage = this.storage();
            storage.setItem(this.key, text);
        } catch {
            // The contract says a write that fails is lost.
        }
    }
}
