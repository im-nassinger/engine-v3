import { describe, expect, test } from 'vitest';

import { Level } from '../../../core/level/index.ts';
import { EditorSession } from '../../session/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { DEFAULT_VIEW_SWITCHES } from '../../view/index.ts';

import { InMemorySettingsStore } from '../testing/InMemorySettingsStore.ts';
import { EditorSettings } from './EditorSettings.ts';

// One opening of the editor on the shared store, built the way the page builds it.
function openEditor(store: InMemorySettingsStore) {
    const frames = new ManualFrames();
    const timer = new ManualTimer();
    const settings = new EditorSettings(store, frames);
    const session = new EditorSession({
        level: Level.createNew(),
        clock: timer.clock,
        timer,
        frames,
        viewSettings: settings.createViewSettings(),
        foldStore: settings.foldStore,
    });
    const restored = settings.follow(session);

    return { frames, settings, session, restored };
}

function storedJson(store: InMemorySettingsStore): unknown {
    return JSON.parse(store.text ?? '');
}

describe('EditorSettings', () => {
    test('with nothing stored, everything has its default and no view is put back', () => {
        const { session, restored, settings } = openEditor(new InMemorySettingsStore());

        expect(restored).toBe(false);
        expect(settings.savedView).toBeUndefined();
        expect(session.viewSettings.all()).toEqual(DEFAULT_VIEW_SWITCHES);
        expect(session.cardFolds.isFolded('BodyComponent')).toBe(false);
        expect(settings.persistAsked.isAsked).toBe(false);
    });

    test('settings written in one session are read back in the next', () => {
        const store = new InMemorySettingsStore();
        const first = openEditor(store);
        first.session.view.zoomAboutMiddle(2);
        first.session.view.centreOn({ x: 120, y: -40 });
        first.session.viewSettings.set('grid', false);
        first.session.viewSettings.set('physicsView', true);
        first.session.cardFolds.setFolded('StyleComponent', true);
        first.settings.persistAsked.markAsked();
        first.frames.runFrame();

        const second = openEditor(store);

        expect(second.restored).toBe(true);
        expect(second.session.view.middle).toEqual({ x: 120, y: -40 });
        expect(second.session.view.zoom).toBe(2);
        expect(second.session.viewSettings.isOn('grid')).toBe(false);
        expect(second.session.viewSettings.isOn('physicsView')).toBe(true);
        expect(second.session.cardFolds.isFolded('StyleComponent')).toBe(true);
        expect(second.settings.persistAsked.isAsked).toBe(true);
    });

    test('changes in one frame are written once, on that frame', () => {
        const store = new InMemorySettingsStore();
        let writes = 0;
        const countingStore = {
            read: () => store.read(),
            write: (text: string) => {
                writes += 1;
                store.write(text);
            },
        };
        const frames = new ManualFrames();
        const timer = new ManualTimer();
        const settings = new EditorSettings(countingStore, frames);
        const session = new EditorSession({ level: Level.createNew(), clock: timer.clock, timer, frames });
        settings.follow(session);

        session.view.panBy(10, 0);
        session.view.panBy(10, 0);
        session.view.zoomIn();
        expect(writes).toBe(0);

        frames.runFrame();
        expect(writes).toBe(1);
        expect(settings.savedView).toEqual({ x: -20, y: 0, zoom: 2 });
    });

    test('being asked to persist is written at once, without waiting for a frame', () => {
        const store = new InMemorySettingsStore();
        const { settings, frames } = openEditor(store);

        settings.persistAsked.markAsked();

        expect(frames.pendingCount).toBe(0);
        expect(storedJson(store)).toMatchObject({ persistAsked: true });
    });

    test('flush writes a change that waits for its frame', () => {
        const store = new InMemorySettingsStore();
        const { settings, session } = openEditor(store);

        session.viewSettings.toggle('jointIcons');
        settings.flush();

        expect(storedJson(store)).toMatchObject({ viewSwitches: { jointIcons: false } });
    });

    test.each([
        ['not json', 'not json'],
        ['an array', '[1, 2]'],
        ['null', 'null'],
    ])('a stored text that is %s gives every default', (_name, text) => {
        const { session, restored, settings } = openEditor(new InMemorySettingsStore(text));

        expect(restored).toBe(false);
        expect(session.viewSettings.all()).toEqual(DEFAULT_VIEW_SWITCHES);
        expect(settings.persistAsked.isAsked).toBe(false);
    });

    test.each([
        ['a text coordinate', { x: '1', y: 0, zoom: 1 }],
        ['an infinite coordinate', { x: 0, y: null, zoom: 1 }],
        ['a zoom of 0', { x: 0, y: 0, zoom: 0 }],
        ['a zoom past the largest', { x: 0, y: 0, zoom: 11 }],
        ['no zoom', { x: 0, y: 0 }],
    ])('a view with %s is damaged and the other keys still load', (_name, view) => {
        const stored = {
            view,
            viewSwitches: { gridSnapping: false },
            foldedCards: ['BodyComponent'],
            persistAsked: true,
        };
        const storedText = JSON.stringify(stored);
        const { session, restored, settings } = openEditor(new InMemorySettingsStore(storedText));

        expect(restored).toBe(false);
        expect(session.view.zoom).toBe(1);
        expect(session.viewSettings.isOn('gridSnapping')).toBe(false);
        expect(session.cardFolds.isFolded('BodyComponent')).toBe(true);
        expect(settings.persistAsked.isAsked).toBe(true);
    });

    test('each view switch is checked on its own', () => {
        const stored = { viewSwitches: { grid: false, cameraFrame: 'no', physicsView: 1, unknown: true } };
        const storedText = JSON.stringify(stored);
        const { session } = openEditor(new InMemorySettingsStore(storedText));

        expect(session.viewSettings.all()).toEqual({ ...DEFAULT_VIEW_SWITCHES, grid: false });
    });

    test('damaged folded cards drop alone', () => {
        const stored = { foldedCards: ['ShapeComponent', 3, 'Component', 'Body', 'ShapeComponent', 'NameComponent'] };
        const storedText = JSON.stringify(stored);
        const store = new InMemorySettingsStore(storedText);
        const { session, frames } = openEditor(store);

        expect(session.cardFolds.isFolded('ShapeComponent')).toBe(true);
        expect(session.cardFolds.isFolded('NameComponent')).toBe(true);

        session.cardFolds.setFolded('NameComponent', false);
        session.cardFolds.setFolded('NameComponent', true);
        frames.runFrame();
        expect(storedJson(store)).toMatchObject({ foldedCards: ['ShapeComponent', 'NameComponent'] });
    });

    test('a damaged key is written again, and keys it does not know are kept', () => {
        const stored = { persistAsked: 'yes', sessionOpen: true, laterKey: 1234 };
        const storedText = JSON.stringify(stored);
        const store = new InMemorySettingsStore(storedText);
        const { settings } = openEditor(store);

        settings.persistAsked.markAsked();

        expect(storedJson(store)).toEqual({
            sessionOpen: true,
            laterKey: 1234,
            viewSwitches: DEFAULT_VIEW_SWITCHES,
            foldedCards: [],
            persistAsked: true,
        });
    });

    test('sessionOpen is written at once and read back by the next session', () => {
        const store = new InMemorySettingsStore();
        const first = openEditor(store);

        expect(first.settings.sessionOpen.isOpen).toBe(false);
        first.settings.sessionOpen.setOpen(true);
        expect(storedJson(store)).toMatchObject({ sessionOpen: true });
        expect(openEditor(store).settings.sessionOpen.isOpen).toBe(true);

        first.settings.sessionOpen.setOpen(false);
        expect(openEditor(store).settings.sessionOpen.isOpen).toBe(false);
    });

    test('a damaged sessionOpen reads as closed', () => {
        const store = new InMemorySettingsStore(JSON.stringify({ sessionOpen: 'yes' }));

        expect(openEditor(store).settings.sessionOpen.isOpen).toBe(false);
    });

    test('a stopped settings writes nothing more', () => {
        const store = new InMemorySettingsStore();
        const { settings, session, frames } = openEditor(store);

        settings.stop();
        session.viewSettings.toggle('grid');

        expect(frames.pendingCount).toBe(0);
        expect(store.text).toBeUndefined();
    });
});
