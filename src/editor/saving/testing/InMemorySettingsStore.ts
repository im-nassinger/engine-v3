import type { SettingsStore } from '../contracts/SettingsStore.ts';

// A SettingsStore for tests: one text in memory, shared by two sessions to stand in for a reload.
export class InMemorySettingsStore implements SettingsStore {
    text: string | undefined;

    constructor(text?: string) {
        this.text = text;
    }

    read() {
        return this.text;
    }

    write(text: string) {
        this.text = text;
    }
}
