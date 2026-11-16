import { afterEach, describe, expect, test } from 'vitest';
import { LocalStorageSettings } from './LocalStorageSettings.ts';

const TEST_KEY = 'engine-v3/settings-test';

function throwingStorage() {
    return {
        getItem(): string | null {
            throw new DOMException('Site data is blocked.', 'SecurityError');
        },
        setItem() {
            throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
        },
    };
}

afterEach(() => {
    window.localStorage.removeItem(TEST_KEY);
});

describe('LocalStorageSettings', () => {
    test('nothing written reads as undefined', () => {
        const settings = new LocalStorageSettings({ key: TEST_KEY });

        expect(settings.read()).toBeUndefined();
    });

    test('a written text is read back by another instance, as in the next session', () => {
        const settings = new LocalStorageSettings({ key: TEST_KEY });
        settings.write('{"grid":true}');

        const nextSession = new LocalStorageSettings({ key: TEST_KEY });

        expect(nextSession.read()).toBe('{"grid":true}');
    });

    test('uses the key engine-v3/settings by default', () => {
        expect(LocalStorageSettings.defaultKey).toBe('engine-v3/settings');
    });

    test('a localStorage that throws reads as undefined and a write is lost without throwing', () => {
        const settings = new LocalStorageSettings({ storage: throwingStorage, key: TEST_KEY });

        expect(settings.read()).toBeUndefined();
        expect(() => settings.write('{}')).not.toThrow();
    });

    test('a localStorage that throws when reached reads as undefined', () => {
        const unreachable = () => {
            throw new DOMException('Site data is blocked.', 'SecurityError');
        };
        const settings = new LocalStorageSettings({ storage: unreachable, key: TEST_KEY });

        expect(settings.read()).toBeUndefined();
        expect(() => settings.write('{}')).not.toThrow();
    });
});
