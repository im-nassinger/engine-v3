import { describe, expect, test } from 'vitest';

import { createV1Registry, NameComponent, TransformComponent } from '../../../core/components/index.ts';
import { Level } from '../../../core/level/index.ts';
import { FormatUpgrader, LevelReader, LevelWriter, V1_LEVEL_LIMITS } from '../../../core/level-data/index.ts';
import { FixedZoneTimeOfDay, ManualClock, ManualFrames } from '../../time/testing/index.ts';

import { EditorSettings } from '../settings/EditorSettings.ts';
import { FakeTabGuard } from '../testing/FakeTabGuard.ts';
import { InMemoryLevelStore } from '../testing/InMemoryLevelStore.ts';
import { InMemorySettingsStore } from '../testing/InMemorySettingsStore.ts';
import { LevelOpener } from './LevelOpener.ts';
import { NOTHING_SAVED_TEXT } from './openingTexts.ts';

// 2026-11-16 14:32 UTC.
const SAVED_AT_MS = 1_794_839_520_000;
const NOW_MS = SAVED_AT_MS + 60_000;
const CRASH_NOTE = 'Recovered from your last save at 14:32. The last few seconds may be missing.';

const writer = new LevelWriter();

function savedLevelJson() {
    const level = Level.createNew();
    const square = level.createEntity(level.world, 0);
    square.addComponent(new TransformComponent());
    square.addComponent(new NameComponent({ name: 'Square' }));

    return JSON.stringify(writer.write(level));
}

type Setup = {
    readonly store?: InMemoryLevelStore;
    readonly settings?: InMemorySettingsStore;
    readonly heldElsewhere?: boolean;
};

// One opening of the editor, built the way the page builds it, on stores a test can share between openings.
function openEditor(setup: Setup = {}) {
    const store = setup.store ?? new InMemoryLevelStore();
    const settingsStore = setup.settings ?? new InMemorySettingsStore();
    const settings = new EditorSettings(settingsStore, new ManualFrames());
    const reader = new LevelReader(createV1Registry(), V1_LEVEL_LIMITS, FormatUpgrader.createCurrent());
    const opener = new LevelOpener({
        tabGuard: new FakeTabGuard(setup.heldElsewhere),
        store,
        reader,
        writer,
        sessionOpen: settings.sessionOpen,
        clock: new ManualClock(NOW_MS),
        timeOfDay: new FixedZoneTimeOfDay(),
    });

    return { store, settingsStore, settings, opening: opener.open() };
}

function entityNames(level: Level) {
    return [...level.world.children].map((child) => child.getComponent(NameComponent)?.get('name'));
}

describe('LevelOpener', () => {
    test('a saved record opens as the level, with no note after a clean close', async () => {
        const store = new InMemoryLevelStore({ levelJson: savedLevelJson(), savedAtMs: SAVED_AT_MS });

        const opening = await openEditor({ store }).opening;

        expect(entityNames(opening.level)).toContain('Square');
        expect(opening).toMatchObject({ canSave: true, isNew: false, damaged: undefined });
        expect(opening.statusText).toBeUndefined();
        expect(store.saveCount).toBe(0);
    });

    test('no record gives a new level whose view fits the camera frame', async () => {
        const store = new InMemoryLevelStore();

        const opening = await openEditor({ store }).opening;

        expect(entityNames(opening.level)).not.toContain('Square');
        expect(opening).toMatchObject({ canSave: true, isNew: true, damaged: undefined });
        expect(opening.statusText).toBeUndefined();
    });

    test('storage that can not open gives a new level that is never saved, and says so', async () => {
        const store = new InMemoryLevelStore();
        store.refusesLoads = true;

        const opening = await openEditor({ store }).opening;

        expect(opening).toMatchObject({ canSave: false, isNew: true, statusText: NOTHING_SAVED_TEXT });
    });

    test('a record that will not open is kept as damaged, and a new level is saved in its place', async () => {
        const damagedJson = '{"format":"engine-v3-level","formatVersion":1,"world":5}';
        const store = new InMemoryLevelStore({ levelJson: damagedJson, savedAtMs: SAVED_AT_MS });

        const opening = await openEditor({ store }).opening;

        expect(opening).toMatchObject({ canSave: true, isNew: true });
        expect(opening.damaged?.levelJson).toBe(damagedJson);
        expect(opening.damaged?.noticeText).toBe(
            "The saved level couldn't be opened: it is damaged. It is kept, and you can export its raw data.",
        );
        expect(store.damaged).toMatchObject({ levelJson: damagedJson, savedAtMs: SAVED_AT_MS });
        expect(store.damaged?.refusal.reason).toBe('damaged');
        expect(store.saved).toEqual({ levelJson: JSON.stringify(writer.write(opening.level)), savedAtMs: NOW_MS });
    });

    test('a damaged record that can not be kept apart is never saved over', async () => {
        const store = new InMemoryLevelStore({ levelJson: 'not json', savedAtMs: SAVED_AT_MS });
        store.refusesKeepingDamaged = true;

        const opening = await openEditor({ store }).opening;

        expect(opening).toMatchObject({ canSave: false, isNew: true, statusText: NOTHING_SAVED_TEXT });
        expect(opening.damaged?.noticeText).toContain("it isn't a level");
        expect(store.saved).toEqual({ levelJson: 'not json', savedAtMs: SAVED_AT_MS });
        expect(store.saveCount).toBe(0);
    });

    test('a newer level is kept, with its own reason', async () => {
        const store = new InMemoryLevelStore({
            levelJson: '{"format":"engine-v3-level","formatVersion":999}',
            savedAtMs: SAVED_AT_MS,
        });

        const opening = await openEditor({ store }).opening;

        expect(opening.damaged?.noticeText).toContain('it was made by a newer version of the game');
        expect(store.damaged?.refusal.reason).toBe('newerVersion');
    });

    test('a crash gives the note with the last save time, a clean close gives none', async () => {
        const store = new InMemoryLevelStore({ levelJson: savedLevelJson(), savedAtMs: SAVED_AT_MS });
        const settings = new InMemorySettingsStore();

        const first = openEditor({ store, settings });
        await first.opening;
        expect(first.settings.sessionOpen.isOpen).toBe(true);

        // The tab crashed: nothing cleared sessionOpen.
        const afterCrash = await openEditor({ store, settings }).opening;
        expect(afterCrash.statusText).toBe(CRASH_NOTE);

        // That session closes cleanly: pagehide clears sessionOpen.
        const reopened = openEditor({ store, settings });
        await reopened.opening;
        reopened.settings.sessionOpen.setOpen(false);
        const afterCleanClose = await openEditor({ store, settings }).opening;
        expect(afterCleanClose.statusText).toBeUndefined();
    });

    test('a crash with no saved level gives no note', async () => {
        const settings = new InMemorySettingsStore(JSON.stringify({ sessionOpen: true }));

        const opening = await openEditor({ settings }).opening;

        expect(opening.statusText).toBeUndefined();
    });

    test('the note is in the browser time zone', async () => {
        const store = new InMemoryLevelStore({ levelJson: savedLevelJson(), savedAtMs: SAVED_AT_MS });
        const settingsStore = new InMemorySettingsStore(JSON.stringify({ sessionOpen: true }));
        const settings = new EditorSettings(settingsStore, new ManualFrames());
        const opener = new LevelOpener({
            tabGuard: new FakeTabGuard(),
            store,
            reader: new LevelReader(createV1Registry(), V1_LEVEL_LIMITS, FormatUpgrader.createCurrent()),
            writer,
            sessionOpen: settings.sessionOpen,
            clock: new ManualClock(NOW_MS),
            timeOfDay: new FixedZoneTimeOfDay(-14 * 60 - 40),
        });

        const opening = await opener.open();

        expect(opening.statusText).toBe('Recovered from your last save at 23:52. The last few seconds may be missing.');
    });

    test('a tab that takes the level from another opens the saved level, with no crash note', async () => {
        const store = new InMemoryLevelStore({ levelJson: savedLevelJson(), savedAtMs: SAVED_AT_MS });
        // The other tab is still open, so sessionOpen is set: that is no crash.
        const settings = new InMemorySettingsStore(JSON.stringify({ sessionOpen: true }));

        const newer = openEditor({ store, settings, heldElsewhere: true });
        const opening = await newer.opening;

        expect(entityNames(opening.level)).toContain('Square');
        expect(opening).toMatchObject({ canSave: true, isNew: false, statusText: undefined });
        expect(newer.settings.sessionOpen.isOpen).toBe(true);
    });
});
