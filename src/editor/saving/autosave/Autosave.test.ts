import { describe, expect, test } from 'vitest';

import { NameComponent, TransformComponent } from '../../../core/components/index.ts';
import { Level } from '../../../core/level/index.ts';
import { LevelWriter } from '../../../core/level-data/index.ts';
import { SetSwitchChange } from '../../history/index.ts';
import { EditorSession } from '../../session/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';

import { InMemoryLevelStore } from '../testing/InMemoryLevelStore.ts';
import { Autosave } from './Autosave.ts';
import type { SaveStatus } from './SaveState.ts';

function buildAutosave() {
    const timer = new ManualTimer();
    const level = Level.createNew();
    const square = level.createEntity(level.world, 0);
    square.addComponent(new TransformComponent());
    square.addComponent(new NameComponent({ name: 'Square' }));
    const session = new EditorSession({ level, clock: timer.clock, timer, frames: new ManualFrames() });
    const store = new InMemoryLevelStore();
    const writer = new LevelWriter();
    const autosave = new Autosave({ session, store, writer, timer, clock: timer.clock });

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

    return { timer, session, store, writer, autosave, statuses, change, position };
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
});
