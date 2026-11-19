import { describe, expect, test } from 'vitest';

import { Level } from '../../../core/level/index.ts';
import { LevelWriter } from '../../../core/level-data/index.ts';
import { EditorSession } from '../../session/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';

import { Autosave, SAVE_FAILED_TEXT } from '../autosave/Autosave.ts';
import type { Opening } from '../opening/LevelOpener.ts';
import { EditorSettings } from '../settings/EditorSettings.ts';
import { FakePersistence } from '../testing/FakePersistence.ts';
import { InMemoryLevelStore } from '../testing/InMemoryLevelStore.ts';
import { InMemorySettingsStore } from '../testing/InMemorySettingsStore.ts';
import { NOTHING_SAVED_WARNING, SaveIndicator } from './SaveIndicator.ts';

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
    test("follows Autosave's state: unsaved until a save has finished", async () => {
        const { session, store, autosave, indicator } = buildAutosave();
        expect(indicator.hasUnsavedChanges).toBe(false);

        session.replaceOpenLevel(Level.createNew());
        expect(indicator.hasUnsavedChanges).toBe(true);

        store.holdsSaves = true;
        const saving = autosave.saveNow();
        expect(indicator.state.status).toBe('saving');
        expect(indicator.hasUnsavedChanges).toBe(true);

        store.finishHeld();
        await saving;
        expect(indicator.hasUnsavedChanges).toBe(false);
        expect(indicator.failedSaveText).toBeUndefined();
    });

    test("a failed save gives Autosave's message", async () => {
        const { session, store, autosave, indicator } = buildAutosave();
        store.refusesSaves = true;
        session.replaceOpenLevel(Level.createNew());

        await autosave.saveNow();

        expect(indicator.failedSaveText).toBe(SAVE_FAILED_TEXT);
        expect(indicator.hasUnsavedChanges).toBe(true);
        autosave.dispose();
    });

    test('a read-only tab has no failed save and never counts as unsaved', () => {
        const indicator = SaveIndicator.forOpening(openingOf({ readOnly: true, canSave: false }), undefined);

        expect(indicator.mode).toBe('readOnly');
        expect(indicator.failedSaveText).toBeUndefined();
        expect(indicator.hasUnsavedChanges).toBe(false);
    });

    test('storage that never saves is failed for good, and always unsaved', () => {
        const indicator = SaveIndicator.forOpening(openingOf({ readOnly: false, canSave: false }), undefined);

        expect(indicator.mode).toBe('nothingSaved');
        expect(indicator.state.status).toBe('failed');
        expect(indicator.failedSaveText).toBe(NOTHING_SAVED_WARNING);
        expect(indicator.hasUnsavedChanges).toBe(true);
    });
});
