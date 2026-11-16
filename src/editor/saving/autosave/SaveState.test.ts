import { describe, expect, test } from 'vitest';

import { SaveState } from './SaveState.ts';

describe('SaveState', () => {
    test('starts saved', () => {
        const state = new SaveState();

        expect(state.status).toBe('saved');
        expect(state.isSaved).toBe(true);
    });

    test('moves its version only when the status changes', () => {
        const state = new SaveState();

        state.set('saved');
        expect(state.version.version).toBe(0);

        state.set('unsaved');
        state.set('unsaved');
        expect(state.version.version).toBe(1);
        expect(state.isSaved).toBe(false);
    });
});
