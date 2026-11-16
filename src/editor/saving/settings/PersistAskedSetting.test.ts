import { describe, expect, test } from 'vitest';

import { InMemorySettingsStore } from '../testing/InMemorySettingsStore.ts';
import { PersistAskedSetting } from './PersistAskedSetting.ts';

describe('PersistAskedSetting', () => {
    test('reads as not asked with no settings', () => {
        expect(new PersistAskedSetting(new InMemorySettingsStore()).isAsked).toBe(false);
    });

    test.each(['not json', '[1]', 'null', '{"persistAsked":"yes"}'])('reads %j as not asked', (text) => {
        expect(new PersistAskedSetting(new InMemorySettingsStore(text)).isAsked).toBe(false);
    });

    test('remembers being asked, keeping the other settings', () => {
        const store = new InMemorySettingsStore('{"grid":true}');
        new PersistAskedSetting(store).markAsked();

        expect(new PersistAskedSetting(store).isAsked).toBe(true);
        expect(JSON.parse(store.text ?? '')).toEqual({ grid: true, persistAsked: true });
    });
});
