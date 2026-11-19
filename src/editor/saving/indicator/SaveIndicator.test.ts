import { describe, expect, test } from 'vitest';

import { Level } from '../../../core/level/index.ts';
import { LevelWriter } from '../../../core/level-data/index.ts';
import { READ_ONLY_REASON } from '../../history/index.ts';
import { EditorSession } from '../../session/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';

import { Autosave, SAVE_FAILED_TEXT } from '../autosave/Autosave.ts';
import type { Opening } from '../opening/LevelOpener.ts';
import { EditorSettings } from '../settings/EditorSettings.ts';
import { FakePersistence } from '../testing/FakePersistence.ts';
import { InMemoryLevelStore } from '../testing/InMemoryLevelStore.ts';
import { InMemorySettingsStore } from '../testing/InMemorySettingsStore.ts';
import {
    NOTHING_SAVED_EXPLANATION,
    SAVED_EXPLANATION,
    SAVING_EXPLANATION,
    SaveIndicator,
    UNSAVED_EXPLANATION,
} from './SaveIndicator.ts';

function openingOf(parts: Pick<Opening, 'readOnly' | 'canSave'>): Opening {
    return { ...parts, level: Level.createNew(), isNew: true, damaged: undefined, statusText: undefined };
}

function buildAutosave() {
    const timer = new ManualTimer();
    const session = new EditorSession({
        level: Level.createNew(),
        clock: timer.clock,
        timer,
        frames: new ManualFrames(),
    });
    const store = new InMemoryLevelStore();
    const autosave = new Autosave({
        session,
        store,
        writer: new LevelWriter(),
        timer,
        clock: timer.clock,
        persistence: new FakePersistence(),
        persistAsked: new EditorSettings(new InMemorySettingsStore(), new ManualFrames()).persistAsked,
    });
    const indicator = SaveIndicator.forOpening(openingOf({ readOnly: false, canSave: true }), autosave);

    return { session, store, autosave, indicator };
}

describe('SaveIndicator', () => {
    test("follows Autosave's state, with a label and an explanation for each", async () => {
        const { session, store, autosave, indicator } = buildAutosave();
        expect(indicator.shown).toEqual({ label: 'Saved', explanation: SAVED_EXPLANATION });
        expect(indicator.hasUnsavedChanges).toBe(false);

        session.replaceOpenLevel(Level.createNew());
        expect(indicator.shown).toEqual({ label: 'Unsaved changes', explanation: UNSAVED_EXPLANATION });
        expect(indicator.hasUnsavedChanges).toBe(true);

        store.holdsSaves = true;
        const saving = autosave.saveNow();
        expect(indicator.shown).toEqual({ label: 'Saving', explanation: SAVING_EXPLANATION });
        expect(indicator.hasUnsavedChanges).toBe(true);

        store.finishHeld();
        await saving;
        expect(indicator.shown.label).toBe('Saved');
        expect(indicator.hasUnsavedChanges).toBe(false);
    });

    test("a failed save explains itself with Autosave's message", async () => {
        const { session, store, autosave, indicator } = buildAutosave();
        store.refusesSaves = true;
        session.replaceOpenLevel(Level.createNew());

        await autosave.saveNow();

        expect(indicator.shown).toEqual({ label: 'Save failed', explanation: SAVE_FAILED_TEXT });
        expect(indicator.failedSaveText).toBe(SAVE_FAILED_TEXT);
        expect(indicator.hasUnsavedChanges).toBe(true);
        autosave.dispose();
    });

    test('a read-only tab shows Read-only and never counts as unsaved', () => {
        const indicator = SaveIndicator.forOpening(openingOf({ readOnly: true, canSave: false }), undefined);

        expect(indicator.mode).toBe('readOnly');
        expect(indicator.shown).toEqual({ label: 'Read-only', explanation: READ_ONLY_REASON });
        expect(indicator.failedSaveText).toBeUndefined();
        expect(indicator.hasUnsavedChanges).toBe(false);
    });

    test('storage that never saves is failed for good, and always unsaved', () => {
        const indicator = SaveIndicator.forOpening(openingOf({ readOnly: false, canSave: false }), undefined);

        expect(indicator.mode).toBe('nothingSaved');
        expect(indicator.state.status).toBe('failed');
        expect(indicator.shown).toEqual({ label: 'Save failed', explanation: NOTHING_SAVED_EXPLANATION });
        expect(indicator.failedSaveText).toBe(NOTHING_SAVED_EXPLANATION);
        expect(indicator.hasUnsavedChanges).toBe(true);
    });
});
