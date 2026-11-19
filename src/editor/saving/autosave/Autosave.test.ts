import { describe, expect, test } from 'vitest';

import { NameComponent, TransformComponent } from '../../../core/components/index.ts';
import { Level } from '../../../core/level/index.ts';
import { LevelWriter, V1_LEVEL_LIMITS } from '../../../core/level-data/index.ts';
import type { LevelLimits } from '../../../core/level-data/index.ts';
import { SetSwitchChange } from '../../history/index.ts';
import { EditorSession } from '../../session/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';

import { EditorSettings } from '../settings/EditorSettings.ts';
import { FakePersistence } from '../testing/FakePersistence.ts';
import { InMemoryLevelStore } from '../testing/InMemoryLevelStore.ts';
import { InMemorySettingsStore } from '../testing/InMemorySettingsStore.ts';
import { Autosave, DATA_CLEARED_TEXT, OVER_SIZE_TEXT, SAVE_FAILED_TEXT } from './Autosave.ts';
import type { SaveStatus } from './SaveState.ts';

type BuildOptions = {
    readonly settings?: InMemorySettingsStore;
    readonly limits?: LevelLimits;
};

function buildAutosave(options: BuildOptions = {}) {
    const timer = new ManualTimer();
    const level = Level.createNew();
    const square = level.createEntity(level.world, 0);
    square.addComponent(new TransformComponent());
    square.addComponent(new NameComponent({ name: 'Square' }));
    const session = new EditorSession({ level, clock: timer.clock, timer, frames: new ManualFrames() });
    const store = new InMemoryLevelStore();
    const writer = new LevelWriter();
    const persistence = new FakePersistence();
    const settings = options.settings ?? new InMemorySettingsStore();
    const autosave = new Autosave({
        session,
        store,
        writer,
        timer,
        clock: timer.clock,
        persistence,
        persistAsked: new EditorSettings(settings, new ManualFrames()).persistAsked,
        limits: options.limits ?? V1_LEVEL_LIMITS,
    });

    const statuses: SaveStatus[] = [];
    autosave.state.version.subscribe(() => statuses.push(autosave.state.status));

    // One undo step: shows or hides the square in the level open now.
    const change = () => {
        const { editor, level: openLevel } = session.openLevel;
        const entity = openLevel.requireEntity(square.id);
        editor.edit('Hide or show', (transaction) => {
            transaction.apply(new SetSwitchChange(entity.id, 'hidden', entity.isHidden, !entity.isHidden));
            return { kind: 'done' };
        });
    };

    const position = { entityId: square.id, schema: TransformComponent.schema, key: 'position' };

    return { timer, session, store, writer, autosave, statuses, change, position, persistence, settings };
}

// Lets the store's promise and what follows it run: a few turns of the microtask queue.
async function settle() {
    for (let turn = 0; turn < 10; turn += 1) {
        await Promise.resolve();
    }
}

async function advance(timer: ManualTimer, ms: number) {
    timer.advance(ms);
    await settle();
}

describe('Autosave', () => {
    test('starts saved, with nothing written', () => {
        const { autosave, store } = buildAutosave();

        expect(autosave.state.status).toBe('saved');
        expect(store.saveCount).toBe(0);
    });

    test('saves one change 2 s after it', async () => {
        const { timer, store, autosave, change } = buildAutosave();

        change();
        expect(autosave.state.status).toBe('unsaved');

        await advance(timer, 1_999);
        expect(store.saveCount).toBe(0);

        await advance(timer, 1);
        expect(store.saveCount).toBe(1);
        expect(autosave.state.status).toBe('saved');
    });

    test('writes level.json with the time it was saved', async () => {
        const { timer, session, store, writer, change } = buildAutosave();
        timer.clock.advance(5_000);

        change();
        await advance(timer, 2_000);

        const expected = JSON.stringify(writer.write(session.openLevel.level));
        expect(store.saved).toEqual({ levelJson: expected, savedAtMs: 7_000 });
    });

    test('goes unsaved, saving, then saved', async () => {
        const { timer, store, statuses, change } = buildAutosave();
        store.holdsSaves = true;

        change();
        await advance(timer, 2_000);
        store.finishHeld();
        await settle();

        expect(statuses).toEqual(['unsaved', 'saving', 'saved']);
    });

    test('restarts the quiet delay with each change', async () => {
        const { timer, store, change } = buildAutosave();

        change();
        await advance(timer, 1_500);
        change();
        await advance(timer, 1_500);
        expect(store.saveCount).toBe(0);

        await advance(timer, 500);
        expect(store.saveCount).toBe(1);
    });

    test('saves a run of changes 1 s apart 20 s after the first', async () => {
        const { timer, store, change } = buildAutosave();

        change();
        for (let second = 1; second < 20; second += 1) {
            await advance(timer, 1_000);
            change();
        }
        expect(store.saveCount).toBe(0);

        await advance(timer, 1_000);
        expect(store.saveCount).toBe(1);
    });

    test('counts the longest wait again from the first change after a save', async () => {
        const { timer, store, change } = buildAutosave();

        change();
        await advance(timer, 2_000);
        expect(store.saveCount).toBe(1);

        await advance(timer, 30_000);
        change();
        for (let second = 1; second < 20; second += 1) {
            await advance(timer, 1_000);
            change();
        }
        expect(store.saveCount).toBe(1);

        await advance(timer, 1_000);
        expect(store.saveCount).toBe(2);
    });

    test('a drag holds the save until it ends', async () => {
        const { timer, session, store, autosave, change, position } = buildAutosave();
        const { liveEdit } = session.openLevel;

        change();
        liveEdit.begin([position]);
        for (let second = 1; second <= 30; second += 1) {
            liveEdit.update(position, { x: second, y: 0 });
            await advance(timer, 1_000);
        }
        expect(store.saveCount).toBe(0);
        expect(autosave.state.status).toBe('unsaved');

        liveEdit.commit('Move 1 entity');
        await settle();

        expect(store.saveCount).toBe(1);
        expect(autosave.state.status).toBe('saved');
    });

    test('a drag that ends before a save is due changes nothing about when it saves', async () => {
        const { timer, session, store, change, position } = buildAutosave();
        const { liveEdit } = session.openLevel;

        change();
        liveEdit.begin([position]);
        liveEdit.cancel();
        await settle();
        expect(store.saveCount).toBe(0);

        await advance(timer, 2_000);
        expect(store.saveCount).toBe(1);
    });

    test('a change during a save gives one more save after it', async () => {
        const { timer, store, autosave, change } = buildAutosave();
        store.holdsSaves = true;

        change();
        await advance(timer, 2_000);
        expect(store.heldCount).toBe(1);

        change();
        await advance(timer, 2_000);
        expect(store.heldCount).toBe(1);
        expect(autosave.state.status).toBe('saving');

        store.finishHeld();
        await settle();
        expect(store.heldCount).toBe(1);

        store.finishHeld();
        await settle();
        expect(store.saveCount).toBe(2);
        expect(autosave.state.status).toBe('saved');
    });

    test('a change during a save leaves the level unsaved when the save ends', async () => {
        const { timer, store, autosave, change } = buildAutosave();
        store.holdsSaves = true;

        change();
        await advance(timer, 2_000);
        change();
        store.finishHeld();
        await settle();

        expect(autosave.state.status).toBe('unsaved');
        await advance(timer, 2_000);
        expect(store.heldCount).toBe(1);
    });

    test('saveNow saves at once, even during a drag', async () => {
        const { session, store, autosave, change, position } = buildAutosave();

        change();
        session.openLevel.liveEdit.begin([position]);
        await autosave.saveNow();

        expect(store.saveCount).toBe(1);
        expect(autosave.state.status).toBe('saved');
    });

    test('saveNow writes nothing when nothing is unsaved', async () => {
        const { store, autosave } = buildAutosave();

        await autosave.saveNow();

        expect(store.saveCount).toBe(0);
    });

    test('saveNow waits for a running save, then saves what changed during it', async () => {
        const { timer, store, autosave, change } = buildAutosave();
        store.holdsSaves = true;
        change();
        await advance(timer, 2_000);
        change();

        let resolved = false;
        const saving = autosave.saveNow().then(() => {
            resolved = true;
        });
        store.finishHeld();
        await settle();
        expect(resolved).toBe(false);
        expect(store.heldCount).toBe(1);

        store.finishHeld();
        await saving;
        expect(store.saveCount).toBe(2);
        expect(autosave.state.status).toBe('saved');
    });

    test('two saveNow calls during a running save write one at a time', async () => {
        const { timer, store, autosave, change } = buildAutosave();
        store.holdsSaves = true;
        change();
        await advance(timer, 2_000);
        change();

        const saving = Promise.all([autosave.saveNow(), autosave.saveNow()]);
        store.finishHeld();
        await settle();
        expect(store.heldCount).toBe(1);

        store.finishHeld();
        await saving;
        expect(store.saveCount).toBe(2);
        expect(autosave.state.status).toBe('saved');
    });

    test('a failed save is failed', async () => {
        const { timer, store, autosave, change } = buildAutosave();
        store.refusesSaves = true;

        change();
        await advance(timer, 2_000);

        expect(autosave.state.status).toBe('failed');
    });

    test('follows a new open level, which is unsaved until it is saved', async () => {
        const { timer, session, store, writer, autosave } = buildAutosave();
        const replacement = Level.createNew();

        session.replaceOpenLevel(replacement);
        expect(autosave.state.status).toBe('unsaved');

        await advance(timer, 2_000);
        expect(store.saved?.levelJson).toBe(JSON.stringify(writer.write(replacement)));
        expect(autosave.state.status).toBe('saved');
    });

    test('stops following the old level after a new one opens', async () => {
        const { timer, session, store, autosave } = buildAutosave();
        const old = session.openLevel;
        session.replaceOpenLevel(Level.createNew());
        await autosave.saveNow();

        old.level.editorData.setGridSize(80);
        await advance(timer, 30_000);

        expect(store.saveCount).toBe(1);
        expect(autosave.state.status).toBe('saved');
    });

    test('a save of the old level ending after a new one opens leaves the new one unsaved', async () => {
        const { timer, session, store, autosave, change } = buildAutosave();
        store.holdsSaves = true;
        change();
        await advance(timer, 2_000);

        session.replaceOpenLevel(Level.createNew());
        store.finishHeld();
        await settle();

        expect(autosave.state.status).toBe('unsaved');
    });

    describe('failures', () => {
        const savingMessages = (session: EditorSession) =>
            session.openLevel.messages.all().filter((message) => message.entityId === undefined);

        test('a failed save shows the level-wide message and is tried again 10 s later', async () => {
            const { timer, session, store, autosave, change } = buildAutosave();
            store.refusesSaves = true;
            change();
            await advance(timer, 2_000);

            expect(savingMessages(session).map((message) => message.text)).toEqual([SAVE_FAILED_TEXT]);
            expect(store.saveCount).toBe(0);

            store.refusesSaves = false;
            await advance(timer, 9_999);
            expect(store.saveCount).toBe(0);

            await advance(timer, 1);
            expect(store.saveCount).toBe(1);
            expect(autosave.state.status).toBe('saved');
            expect(savingMessages(session)).toEqual([]);
        });

        test('keeps trying every 10 s while saves fail', async () => {
            const { timer, store, autosave, change } = buildAutosave();
            let tries = 0;
            const save = store.save.bind(store);
            store.save = (level) => {
                tries += 1;
                return save(level);
            };
            store.refusesSaves = true;
            change();

            await advance(timer, 2_000);
            for (let retry = 0; retry < 3; retry += 1) {
                await advance(timer, 10_000);
            }

            expect(tries).toBe(4);
            expect(autosave.state.status).toBe('failed');
        });

        test('stays failed through a change, which still saves after the quiet delay', async () => {
            const { timer, store, autosave, change } = buildAutosave();
            store.refusesSaves = true;
            change();
            await advance(timer, 2_000);

            store.refusesSaves = false;
            change();
            expect(autosave.state.status).toBe('failed');

            await advance(timer, 2_000);
            expect(store.saveCount).toBe(1);
            expect(autosave.state.status).toBe('saved');
        });

        test('the message moves to a level opened while it stands', async () => {
            const { timer, session, store, change } = buildAutosave();
            store.refusesSaves = true;
            change();
            await advance(timer, 2_000);

            session.replaceOpenLevel(Level.createNew());

            expect(session.openLevel.messages.all().map((message) => message.text)).toEqual([SAVE_FAILED_TEXT]);
        });

        test('a level over the size limit is not written, and its message names the limit', async () => {
            const { timer, session, store, autosave, change } = buildAutosave({
                limits: { ...V1_LEVEL_LIMITS, maxBytes: 100 },
            });
            change();
            await advance(timer, 2_000);

            expect(store.saveCount).toBe(0);
            expect(autosave.state.status).toBe('failed');
            expect(savingMessages(session).map((message) => message.text)).toEqual([OVER_SIZE_TEXT]);

            await advance(timer, 60_000);
            expect(store.saveCount).toBe(0);
        });

        test('a store emptied after a save is written again, and the status text says so', async () => {
            const { timer, session, store, change } = buildAutosave();
            change();
            await advance(timer, 2_000);
            expect(session.status.current).toBeUndefined();

            store.saved = undefined;
            change();
            await advance(timer, 2_000);

            expect(store.saved).toBeDefined();
            expect(session.status.current).toBe(DATA_CLEARED_TEXT);
        });

        test('the first save into an empty store says nothing', async () => {
            const { timer, session, change } = buildAutosave();
            change();
            await advance(timer, 2_000);

            expect(session.status.current).toBeUndefined();
        });
    });

    describe('asking to persist', () => {
        test('asks after the first save that works, not before', async () => {
            const { timer, store, persistence, change } = buildAutosave();
            store.refusesSaves = true;
            change();
            await advance(timer, 2_000);
            expect(persistence.askCount).toBe(0);

            store.refusesSaves = false;
            await advance(timer, 10_000);
            expect(persistence.askCount).toBe(1);

            change();
            await advance(timer, 2_000);
            expect(persistence.askCount).toBe(1);
        });

        test('asks once across two sessions', async () => {
            const first = buildAutosave();
            first.change();
            await advance(first.timer, 2_000);

            const second = buildAutosave({ settings: first.settings });
            second.change();
            await advance(second.timer, 2_000);

            expect(first.persistence.askCount).toBe(1);
            expect(second.persistence.askCount).toBe(0);
        });
    });

    test('dispose stops the retry', async () => {
        const { timer, store, autosave, change } = buildAutosave();
        store.refusesSaves = true;
        change();
        await advance(timer, 2_000);

        autosave.dispose();
        store.refusesSaves = false;
        await advance(timer, 30_000);

        expect(store.saveCount).toBe(0);
    });

    describe('in a read-only tab', () => {
        test('never saves: not on a change, not on saveNow, not on a level opened later', async () => {
            const { timer, session, store, autosave, statuses, position } = buildAutosave();
            session.makeReadOnly();
            const square = session.openLevel.level.requireEntity(position.entityId);

            // Nothing in a read-only tab can edit, so the level is changed past the editor.
            square.requireComponent(TransformComponent).set('position', { x: 5, y: 5 });
            await advance(timer, 30_000);
            await autosave.saveNow();
            session.replaceOpenLevel(Level.createNew());
            await advance(timer, 30_000);

            expect(store.saveCount).toBe(0);
            expect(autosave.state.status).toBe('saved');
            expect(statuses).toEqual([]);
        });

        test('a save due when the tab turns read-only is not written', async () => {
            const { timer, session, store, change } = buildAutosave();
            change();

            session.makeReadOnly();
            await advance(timer, 30_000);

            expect(store.saveCount).toBe(0);
        });
    });
});
