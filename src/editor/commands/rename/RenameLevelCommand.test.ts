import { describe, expect, test } from 'vitest';

import { Level } from '../../../core/level/index.ts';
import { EditorSession } from '../../session/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { CommandRunner } from '../running/CommandRunner.ts';

import { RenameLevelCommand } from './RenameLevelCommand.ts';

function buildCommand() {
    const timer = new ManualTimer();
    const session = new EditorSession({
        level: Level.createNew(),
        clock: timer.clock,
        timer,
        frames: new ManualFrames(),
    });
    const runner = new CommandRunner(session.status);
    const command = new RenameLevelCommand(session);

    return { session, runner, command };
}

describe('RenameLevelCommand', () => {
    test('asks for the name in a dialog, starting from the current one, and changes nothing yet', () => {
        const { session, runner, command } = buildCommand();

        runner.run(command);

        const dialog = runner.dialog.current;
        if (dialog?.kind !== 'textRequest') throw new Error('No text request.');
        expect(dialog.request.value).toBe('Untitled level');
        expect(session.openLevel.history.undoCount).toBe(0);
    });

    test('the answer renames the level as one undo step and closes the dialog', () => {
        const { session, runner, command } = buildCommand();
        runner.run(command);

        runner.submitDialogText('  Bridge ');

        expect(session.openLevel.level.name).toBe('Bridge');
        expect(session.openLevel.history.undoLabel).toBe('Rename level');
        expect(runner.dialog.current).toBeUndefined();
    });

    test('a name too long keeps the old one and says why', () => {
        const { session, runner, command } = buildCommand();
        runner.run(command);

        runner.submitDialogText('x'.repeat(Level.maxNameLength + 1));

        expect(session.openLevel.level.name).toBe('Untitled level');
        expect(session.status.current).toBe(`A level name can be at most ${Level.maxNameLength} characters`);
    });

    test('closing the dialog changes nothing', () => {
        const { session, runner, command } = buildCommand();
        runner.run(command);

        runner.closeDialog();

        expect(session.openLevel.level.name).toBe('Untitled level');
        expect(runner.dialog.current).toBeUndefined();
    });
});
