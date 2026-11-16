import { afterEach, describe, expect, test, vi } from 'vitest';

import { SaveIndicator, SaveState } from '../../../editor/saving/index.ts';
import type { SaveMode } from '../../../editor/saving/index.ts';

import { PageSavingEvents } from './PageSavingEvents.ts';

function buildEvents(mode: SaveMode = 'autosave') {
    const state = new SaveState();
    const indicator = new SaveIndicator({ state, mode, failureText: () => undefined });
    const counts = { saves: 0, flushes: 0 };
    const sessionOpen = { isOpen: true, setOpen: (open: boolean) => (sessionOpen.isOpen = open) };
    const parts = {
        indicator,
        saving: { saveNow: () => ((counts.saves += 1), Promise.resolve()) },
        settings: { flush: () => (counts.flushes += 1) },
        sessionOpen,
    };
    const events = new PageSavingEvents(parts, window);
    const disconnect = events.connect();

    return { state, counts, sessionOpen, disconnect };
}

// Whether leaving the page now would ask first.
function leavePromptShown() {
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);

    return event.defaultPrevented;
}

let disconnects: (() => void)[] = [];

function connected(built: ReturnType<typeof buildEvents>) {
    disconnects.push(built.disconnect);

    return built;
}

afterEach(() => {
    disconnects.forEach((disconnect) => disconnect());
    disconnects = [];
    vi.restoreAllMocks();
});

describe('PageSavingEvents', () => {
    test('the leave prompt is armed only while the level is unsaved', () => {
        const { state } = connected(buildEvents());
        expect(leavePromptShown()).toBe(false);

        state.set('unsaved');
        expect(leavePromptShown()).toBe(true);
        state.set('saving');
        expect(leavePromptShown()).toBe(true);
        state.set('failed');
        expect(leavePromptShown()).toBe(true);

        state.set('saved');
        expect(leavePromptShown()).toBe(false);
    });

    test('a read-only tab never asks before leaving', () => {
        const { state } = connected(buildEvents('readOnly'));

        state.set('unsaved');

        expect(leavePromptShown()).toBe(false);
    });

    test('disconnecting disarms the prompt', () => {
        const { state, disconnect } = buildEvents();
        state.set('unsaved');

        disconnect();

        expect(leavePromptShown()).toBe(false);
    });

    test('a hidden tab saves at once and writes the settings', () => {
        const { counts } = connected(buildEvents());
        const visibility = vi.spyOn(document, 'visibilityState', 'get');

        visibility.mockReturnValue('visible');
        document.dispatchEvent(new Event('visibilitychange'));
        expect(counts).toEqual({ saves: 0, flushes: 0 });

        visibility.mockReturnValue('hidden');
        document.dispatchEvent(new Event('visibilitychange'));
        expect(counts).toEqual({ saves: 1, flushes: 1 });
    });

    test('leaving the page saves and clears sessionOpen; coming back from the cache sets it again', () => {
        const { counts, sessionOpen } = connected(buildEvents());

        window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
        expect(sessionOpen.isOpen).toBe(false);
        expect(counts.saves).toBe(1);

        window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false }));
        expect(sessionOpen.isOpen).toBe(false);
        window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
        expect(sessionOpen.isOpen).toBe(true);
    });
});
