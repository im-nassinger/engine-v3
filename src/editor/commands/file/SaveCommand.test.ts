import { describe, expect, test } from 'vitest';

import { Level } from '../../../core/level/index.ts';
import { READ_ONLY_REASON } from '../../history/index.ts';
import { SAVE_FAILED_TEXT } from '../../saving/index.ts';
import { EditorSession } from '../../session/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { createCommandRegistry } from '../createCommandRegistry.ts';
import { buildFileTestParts, settle } from './testing/fileTestParts.ts';

import { SAVED_TEXT, SaveCommand } from './SaveCommand.ts';

function buildCommand() {
    const timer = new ManualTimer();
    const session = new EditorSession({
        level: Level.createNew(),
        clock: timer.clock,
        timer,
        frames: new ManualFrames(),
    });
    const { parts, saving, files } = buildFileTestParts(session);
    const command = new SaveCommand(session, parts);

    return { session, parts, saving, files, command };
}

describe('SaveCommand', () => {
    test('is in the File menu with Ctrl+S, which works everywhere', () => {
        const { command } = buildCommand();

        expect(command.menu.menu).toBe('File');
        expect(command.shortcuts).toEqual(['Ctrl+S']);
        expect(command.shortcutScope).toBe('everywhere');
    });

    test('ends the typing, saves now and says so, without exporting', async () => {
        const { session, saving, files, command } = buildCommand();

        expect(command.run()).toEqual({ kind: 'done' });
        await settle();

        expect(saving.commitCount).toBe(1);
        expect(saving.saveCount).toBe(1);
        expect(session.status.current).toBe(SAVED_TEXT);
        expect(files.exported).toEqual([]);
    });

    test('says why when saving fails', async () => {
        const { session, saving, command } = buildCommand();
        saving.failure = 'The disk is full';

        command.run();
        await settle();

        expect(session.status.current).toBe('The disk is full');
    });

    test('says so when the save itself throws', async () => {
        const { session, saving, command } = buildCommand();
        saving.saveNow = () => Promise.reject(new Error('Out of memory.'));

        command.run();
        await settle();

        expect(session.status.current).toBe(SAVE_FAILED_TEXT);
    });

    test('is disabled in a read-only tab, with the reason', () => {
        const { session, parts, saving } = buildCommand();
        session.makeReadOnly();
        const save = createCommandRegistry(session, undefined, parts).find('file.save');

        expect(save?.availability()).toEqual({ enabled: false, reason: READ_ONLY_REASON });
        expect(save?.run()).toEqual({ kind: 'refused', reason: READ_ONLY_REASON });
        expect(saving.saveCount).toBe(0);
    });
});
