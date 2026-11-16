import { describe, expect, test } from 'vitest';

import { TransformComponent } from '../../../core/components/index.ts';
import { Level } from '../../../core/level/index.ts';
import { LevelWriter } from '../../../core/level-data/index.ts';
import type { ReadRefusal } from '../../../core/level-data/index.ts';
import { READ_ONLY_REASON } from '../../history/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { createCommandRegistry } from '../createCommandRegistry.ts';
import type { CommandOutcome } from '../EditorCommand.ts';
import { CommandRunner } from '../running/CommandRunner.ts';
import { buildCommandTestSession } from '../testing/commandTestSession.ts';
import { buildFileTestParts, settle } from './testing/fileTestParts.ts';

import { FileDropEvents } from './FileDropEvents.ts';
import { IMPORT_REFUSED_TITLE, REPLACE_LABEL, REPLACE_QUESTION_TEXT } from './LevelReplacement.ts';

const VIEW_WIDTH = 800;
const VIEW_HEIGHT = 600;

function buildEditor() {
    const timer = new ManualTimer();
    const built = buildCommandTestSession(timer.clock, timer, new ManualFrames());
    const session = built.session;
    session.view.setSize(VIEW_WIDTH, VIEW_HEIGHT);
    const file = buildFileTestParts(session);
    const registry = createCommandRegistry(session, undefined, file.parts);
    const runner = new CommandRunner(session.status);

    // A step in the history, to see that replacing the level clears it.
    runner.run(requireCommand('edit.selectAll'));
    runner.run(requireCommand('edit.delete'));

    function requireCommand(id: string) {
        const command = registry.find(id);
        if (command === undefined) throw new Error(`No command ${id}.`);

        return command;
    }

    return { ...built, ...file, session, registry, runner, requireCommand };
}

// A level saved elsewhere, with a box and its camera moved away from the origin, as the import worker
// answers with it.
function importedLevelData() {
    const level = Level.createNew();
    level.rename('Castle');
    const camera = level.camera.getComponent(TransformComponent);
    camera?.writeValue('position', { x: 5000, y: 3000 });
    const box = level.createEntity(level.world, 0);
    box.addComponent(new TransformComponent());

    return new LevelWriter().write(level);
}

function expectQuestion(outcome: CommandOutcome, title: string) {
    if (outcome.kind !== 'needsConfirmation') throw new Error(`Expected a question, got ${outcome.kind}.`);

    expect(outcome.question).toEqual({ title, text: REPLACE_QUESTION_TEXT, confirmLabel: REPLACE_LABEL });

    return outcome;
}

describe('New', () => {
    test('asks first, and cancelling changes nothing', () => {
        const { session, requireCommand, runner, saving } = buildEditor();
        const openLevel = session.openLevel;

        runner.run(requireCommand('file.new'));

        expect(runner.dialog.current?.kind).toBe('question');
        runner.closeDialog();
        expect(session.openLevel).toBe(openLevel);
        expect(openLevel.history.undoCount).toBe(1);
        expect(saving.saveCount).toBe(0);
    });

    test('replaces the level with a new one, clears the history and saves at once', () => {
        const { session, requireCommand, saving } = buildEditor();
        const oldLevel = session.openLevel.level;

        const outcome = expectQuestion(requireCommand('file.new').run(), 'New level');
        expect(outcome.confirm()).toEqual({ kind: 'done', text: 'New level' });

        expect(session.openLevel.level).not.toBe(oldLevel);
        expect([...session.openLevel.level.entitiesInPanelOrder()].length).toBe(2);
        expect(session.openLevel.history.undoCount).toBe(0);
        expect(saving.saveCount).toBe(1);
    });

    test('is disabled in a read-only tab', () => {
        const { session, requireCommand } = buildEditor();
        session.makeReadOnly();

        expect(requireCommand('file.new').availability()).toEqual({ enabled: false, reason: READ_ONLY_REASON });
    });
});

describe('Import', () => {
    test('is in the File menu with Ctrl+O', () => {
        const { requireCommand } = buildEditor();
        const command = requireCommand('file.import');

        expect(command.menu?.menu).toBe('File');
        expect(command.shortcuts).toEqual(['Ctrl+O']);
    });

    test('cancelling the question opens no picker and changes nothing', () => {
        const { session, requireCommand, runner, picker } = buildEditor();
        const openLevel = session.openLevel;

        runner.run(requireCommand('file.import'));
        runner.closeDialog();

        expect(picker.pickedCount).toBe(0);
        expect(session.openLevel).toBe(openLevel);
    });

    test('cancelling the picker changes nothing', async () => {
        const { session, requireCommand, picker, importer } = buildEditor();
        const openLevel = session.openLevel;
        picker.file = undefined;

        expectQuestion(requireCommand('file.import').run(), 'Import').confirm();
        await settle();

        expect(picker.pickedCount).toBe(1);
        expect(importer.importedCount).toBe(0);
        expect(session.openLevel).toBe(openLevel);
    });

    test('replaces the level, clears the history, saves and fits the camera frame', async () => {
        const { session, requireCommand, importer, saving } = buildEditor();
        importer.answer = { ok: true, value: importedLevelData() };

        expectQuestion(requireCommand('file.import').run(), 'Import').confirm();
        await settle();

        const openLevel = session.openLevel;
        expect(openLevel.level.name).toBe('Castle');
        expect([...openLevel.level.entitiesInPanelOrder()].length).toBe(3);
        expect(openLevel.history.undoCount).toBe(0);
        expect(saving.saveCount).toBe(1);
        expect(session.view.middle.x).toBeCloseTo(5000);
        expect(session.view.middle.y).toBeCloseTo(3000);
        expect(session.status.current).toBe('Imported castle.editable');
    });

    const refusals: readonly [ReadRefusal, string][] = [
        [{ reason: 'notALevel' }, "This file isn't a level"],
        [
            { reason: 'overLimit', limit: 'size', max: 256 * 1024 * 1024 },
            'This file is too big: a level holds at most 256 MB',
        ],
        [{ reason: 'damaged', detail: 'level.json is not JSON' }, 'This level file is damaged'],
        [{ reason: 'newerVersion', fileVersion: 9 }, 'This level was made by a newer version of the game'],
        [
            { reason: 'overLimit', limit: 'entities', max: 100_000 },
            'This level is over a limit: it has more than 100,000 entities',
        ],
    ];

    test.each(refusals)('a refusal (%o) has its message and leaves the level as it was', async (refusal, text) => {
        const { session, requireCommand, importer, lateOutcomes, saving } = buildEditor();
        const openLevel = session.openLevel;
        importer.answer = { ok: false, refusal };

        expectQuestion(requireCommand('file.import').run(), 'Import').confirm();
        await settle();

        expect(lateOutcomes).toEqual([{ kind: 'notice', notice: { title: IMPORT_REFUSED_TITLE, text } }]);
        expect(session.openLevel).toBe(openLevel);
        expect(openLevel.history.undoCount).toBe(1);
        expect(saving.saveCount).toBe(0);
    });

    test('a worker that fails is a damaged file', async () => {
        const { session, requireCommand, importer, lateOutcomes } = buildEditor();
        const openLevel = session.openLevel;
        importer.answer = new Error('The import worker failed.');

        expectQuestion(requireCommand('file.import').run(), 'Import').confirm();
        await settle();

        expect(lateOutcomes).toEqual([
            { kind: 'notice', notice: { title: IMPORT_REFUSED_TITLE, text: 'This level file is damaged' } },
        ]);
        expect(session.openLevel).toBe(openLevel);
    });

    test('is disabled and refused in a read-only tab, also for a dropped file', () => {
        const { session, requireCommand, registry, runner } = buildEditor();
        session.makeReadOnly();
        const drops = new FileDropEvents(registry, runner);

        expect(requireCommand('file.import').availability()).toEqual({ enabled: false, reason: READ_ONLY_REASON });
        drops.dropFile({ name: 'castle.editable', read: () => Promise.resolve(new ArrayBuffer(0)) });

        expect(runner.dialog.current).toBeUndefined();
        expect(session.status.current).toBe(READ_ONLY_REASON);
    });
});

describe('Dropping a file', () => {
    test('asks, then imports the dropped file without the picker', async () => {
        const { session, registry, runner, importer, picker } = buildEditor();
        importer.answer = { ok: true, value: importedLevelData() };
        const drops = new FileDropEvents(registry, runner);

        drops.dropFile({ name: 'tower.editable', read: () => Promise.resolve(new ArrayBuffer(0)) });
        expect(runner.dialog.current?.kind).toBe('question');
        runner.confirmDialog();
        await settle();

        expect(picker.pickedCount).toBe(0);
        expect(session.openLevel.level.name).toBe('Castle');
        expect(session.status.current).toBe('Imported tower.editable');
    });

    test('does nothing while a dialog is open', () => {
        const { session, registry, runner, requireCommand } = buildEditor();
        const drops = new FileDropEvents(registry, runner);
        runner.run(requireCommand('file.new'));

        drops.dropFile({ name: 'tower.editable', read: () => Promise.resolve(new ArrayBuffer(0)) });

        expect(runner.dialog.waitingCount).toBe(0);
        expect(session.openLevel.history.undoCount).toBe(1);
    });
});
