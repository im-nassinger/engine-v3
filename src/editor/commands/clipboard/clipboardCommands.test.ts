import { describe, expect, test } from 'vitest';

import { NameComponent, ShapeComponent, TransformComponent } from '../../../core/components/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import { EditorClipboard } from '../../clipboard/index.ts';
import type { SystemClipboard } from '../../clipboard/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { CommandRunner } from '../running/CommandRunner.ts';
import { buildCommandTestSession, expectRoundTrip, levelSnapshot } from '../testing/commandTestSession.ts';
import type { CopyCommand } from './CopyCommand.ts';
import type { CutCommand } from './CutCommand.ts';
import type { PasteCommand } from './PasteCommand.ts';
import { createCommandRegistry } from '../createCommandRegistry.ts';

// A system clipboard that can refuse reads.
class FakeSystemClipboard implements SystemClipboard {
    text = '';
    refusesReads = false;

    writeText(text: string) {
        this.text = text;
        return Promise.resolve();
    }

    readText() {
        if (this.refusesReads) return Promise.reject(new Error('Read refused.'));

        return Promise.resolve(this.text);
    }
}

// The command test level with a 40 by 20 crate at 300, 0 on top, and the clipboard commands on a fake
// system clipboard with a mouse the test moves.
function buildSession() {
    const timer = new ManualTimer();
    const built = buildCommandTestSession(timer.clock, timer, new ManualFrames());
    const { level, session } = built;

    const crate = level.createEntity(level.world, 0);
    const position = { x: 300, y: 0 };
    crate.addComponent(new TransformComponent({ ...TransformComponent.schema.defaults(), position }));
    crate.addComponent(new NameComponent({ name: 'Crate' }));
    crate.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width: 40, height: 20 } }));

    const system = new FakeSystemClipboard();
    const clipboard = new EditorClipboard(system);
    const mouse: { current: Point | undefined; screenPosition: Point | undefined } = {
        current: undefined,
        screenPosition: undefined,
    };
    const registry = createCommandRegistry(session, { clipboard, mouse });
    const runner = new CommandRunner(session.status);
    // Off unless a test turns it on, so a paste lands exactly on the mouse.
    session.viewSettings.set('gridSnapping', false);

    const copy = registry.find('edit.copy') as CopyCommand;
    const cut = registry.find('edit.cut') as CutCommand;
    const paste = registry.find('edit.paste') as PasteCommand;

    return { ...built, crate, system, clipboard, mouse, runner, copy, cut, paste };
}

function selectedPositions(built: ReturnType<typeof buildSession>) {
    const { selection } = built.session.openLevel;

    return selection.entities.map((entity) => entity.requireComponent(TransformComponent).get('position'));
}

describe('Copy', () => {
    test('puts the selection on both clipboards and changes nothing', () => {
        const built = buildSession();
        const { session, copy, crate, system, clipboard } = built;
        session.openLevel.selection.replace([crate.id]);
        const before = levelSnapshot(session.openLevel.level);

        const outcome = copy.run();

        expect(outcome).toEqual({ kind: 'done', skipped: [] });
        expect(clipboard.lastCopy).toContain('"engine-v3":"entities"');
        expect(system.text).toBe(clipboard.lastCopy);
        expect(levelSnapshot(session.openLevel.level)).toEqual(before);
        expect(session.openLevel.history.undoLabel).toBeUndefined();
    });

    test('skips the camera, and says so', () => {
        const built = buildSession();
        const { session, copy, crate, level, runner } = built;
        session.openLevel.selection.replace([crate.id, level.camera.id]);

        runner.run(copy);

        expect(session.status.current).toBe('Camera kept');
        expect(built.clipboard.lastCopy).not.toContain('CameraComponent');
        expect(built.clipboard.lastCopy).toBeDefined();
    });

    test('gives the World and the camera alone their own texts', () => {
        const built = buildSession();
        const { session, copy, cut, level } = built;

        session.openLevel.selection.replace([level.world.id]);
        expect(copy.availability()).toEqual({ enabled: false, reason: "The World can't be copied" });
        expect(cut.availability()).toEqual({ enabled: false, reason: "The World can't be cut" });

        session.openLevel.selection.replace([level.camera.id]);
        expect(copy.run()).toEqual({ kind: 'refused', reason: "The camera can't be copied" });
        expect(cut.run()).toEqual({ kind: 'refused', reason: "The camera can't be cut" });

        session.openLevel.selection.replace([]);
        expect(copy.availability()).toEqual({ enabled: false, reason: 'Nothing selected' });
        expect(built.clipboard.lastCopy).toBeUndefined();
    });
});

describe('Cut', () => {
    test('copies, then deletes as Delete does, attached joints included, in one step', () => {
        const built = buildSession();
        const { session, cut, level, group, child, rope, crate } = built;
        session.openLevel.selection.replace([group.id, crate.id]);

        const outcome = cut.run();

        expect(outcome).toEqual({ kind: 'done', selectAfter: [], skipped: [] });
        expect(level.findEntity(group.id)).toBeUndefined();
        expect(level.findEntity(child.id)).toBeUndefined();
        expect(level.findEntity(rope.id)).toBeUndefined();
        expect(level.findEntity(crate.id)).toBeUndefined();
        expect(session.openLevel.history.undoLabel).toBe('Cut 2 entities');
        expect(built.clipboard.lastCopy).toContain('"Crate"');
        expect(built.clipboard.lastCopy).not.toContain('"Rope"');
    });

    test('passes the run, undo, redo round trip', () => {
        const built = buildSession();
        const { session, cut, square, crate } = built;
        session.openLevel.selection.replace([square.id, crate.id]);

        const trip = expectRoundTrip(session, () => cut.run());

        expect(trip.afterUndo).toEqual(trip.before);
        expect(trip.afterRedo).toEqual(trip.after);
        expect(trip.after).not.toEqual(trip.before);
    });
});

describe('Paste', () => {
    test('pastes a copy centred on the mouse, selected, and passes the round trip', () => {
        const built = buildSession();
        const { session, copy, paste, crate, mouse } = built;
        session.openLevel.selection.replace([crate.id]);
        copy.run();
        mouse.current = { x: -50, y: 70 };

        const trip = expectRoundTrip(session, () => {
            const text = built.clipboard.lastCopy;
            paste.pasteText(text);
        });

        expect(trip.afterUndo).toEqual(trip.before);
        expect(trip.afterRedo).toEqual(trip.after);
        expect(session.openLevel.history.undoLabel).toBe('Paste Crate');
        expect(session.openLevel.selection.ids).not.toEqual([crate.id]);
        expect(selectedPositions(built)).toEqual([{ x: -50, y: 70 }]);
    });

    test("centres on the view's middle when the mouse is outside the level view", () => {
        const built = buildSession();
        const { session, copy, paste, crate } = built;
        session.openLevel.selection.replace([crate.id]);
        copy.run();
        session.view.centreOn({ x: 120, y: -40 });

        paste.pasteText(built.clipboard.lastCopy);

        expect(selectedPositions(built)).toEqual([session.view.middle]);
    });

    test('from the menu reads the system clipboard and shows the outcome when the text arrives', async () => {
        const built = buildSession();
        const { session, copy, paste, crate, runner, system } = built;
        session.openLevel.selection.replace([crate.id]);
        copy.run();
        system.text = 'plain text';

        runner.run(paste);
        await paste.readAndPaste();

        expect(session.status.current).toBe('Nothing to paste');
    });

    test('pastes the last copy when the system refuses the read', async () => {
        const built = buildSession();
        const { session, copy, paste, crate, system, level } = built;
        session.openLevel.selection.replace([crate.id]);
        copy.run();
        system.text = 'plain text';
        system.refusesReads = true;
        const countBefore = [...level.entitiesInPanelOrder()].length;

        await paste.readAndPaste();

        const countAfter = [...level.entitiesInPanelOrder()].length;
        expect(countAfter).toBe(countBefore + 1);
        expect(session.openLevel.history.undoLabel).toBe('Paste Crate');
    });

    test('says Nothing to paste for plain text, other JSON and an empty clipboard', () => {
        const { paste } = buildSession();
        const nothing = { kind: 'refused', reason: 'Nothing to paste' };

        expect(paste.pasteText('a crate')).toEqual(nothing);
        expect(paste.pasteText('{"name":"Crate"}')).toEqual(nothing);
        expect(paste.pasteText(undefined)).toEqual(nothing);
    });

    test('refuses damaged tagged text and changes nothing', () => {
        const { session, paste } = buildSession();
        const before = levelSnapshot(session.openLevel.level);
        const damaged = '{"engine-v3":"entities","formatVersion":1}';

        const outcome = paste.pasteText(damaged);

        expect(outcome).toEqual({ kind: 'refused', reason: "The pasted entities can't be read: they are damaged" });
        expect(levelSnapshot(session.openLevel.level)).toEqual(before);
    });

    test("with grid snapping on puts the set's top left on the nearest grid point", () => {
        const built = buildSession();
        const { session, copy, paste, crate, mouse } = built;
        session.openLevel.selection.replace([crate.id]);
        copy.run();
        session.viewSettings.set('gridSnapping', true);
        mouse.current = { x: 10, y: 20 };

        paste.pasteText(built.clipboard.lastCopy);

        // The 40 by 20 crate's top left, at -10, 10, snaps to the origin on the 50 grid.
        expect(selectedPositions(built)).toEqual([{ x: 20, y: 10 }]);
    });

    test('pastes what was cut back where the mouse is', () => {
        const built = buildSession();
        const { session, cut, paste, crate, mouse } = built;
        session.openLevel.selection.replace([crate.id]);
        cut.run();
        mouse.current = { x: 10, y: 20 };

        paste.pasteText(built.clipboard.lastCopy);

        expect(selectedPositions(built)).toEqual([{ x: 10, y: 20 }]);
        expect(session.openLevel.history.undoLabel).toBe('Paste Crate');
    });
});
