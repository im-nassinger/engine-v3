import type { SettingsStore } from '../contracts/SettingsStore.ts';

// Whether the browser was already asked to keep the saved level, kept as `persistAsked` in the settings'
// JSON so the question is asked once across sessions. A missing or damaged value reads as not asked.
export class PersistAskedSetting {
    private readonly store: SettingsStore;

    constructor(store: SettingsStore) {
        this.store = store;
    }

    get isAsked() {
        return this.readSettings().persistAsked === true;
    }

    // Keeps every other key of the settings as it was.
    markAsked() {
        this.store.write(JSON.stringify({ ...this.readSettings(), persistAsked: true }));
    }

    private readSettings(): Record<string, unknown> {
        const text = this.store.read();
        if (text === undefined) return {};

        try {
            const parsed: unknown = JSON.parse(text);

            return isRecord(parsed) ? parsed : {};
        } catch {
            return {};
        }
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
