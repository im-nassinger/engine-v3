import { describe, expect, test } from 'vitest';

import { STOP_TO_EDIT_TEXT } from '../../play/index.ts';
import { ClipboardEvents } from '../clipboard/ClipboardEvents.ts';
import { buildPlayTestSession, editorSnapshot } from './testing/playTestSession.ts';

import { NOT_PAUSED_REASON, NOT_PLAYING_REASON } from './playReasons.ts';

describe('the Play commands', () => {
    test('the Play menu holds Play, Pause and Step with their keys', () => {
        const { registry } = buildPlayTestSession();

        const entries = registry.menu('Play').map((command) => [command.label, command.shortcuts]);

        expect(entries).toEqual([
            ['Play', ['Ctrl+Enter']],
            ['Pause', ['F8']],
            ['Step', ['F9']],
        ]);
    });

    test('Play or Stop plays, then stops, and its label follows', () => {
        const built = buildPlayTestSession();
        const { runner, play, calls, requireCommand } = built;
        const playOrStop = requireCommand('play.playOrStop');

        runner.run(playOrStop);
        expect(calls).toEqual(['commit', 'save']);
        expect(play.state).toBe('starting');
        expect(playOrStop.label).toBe('Stop');

        runner.run(playOrStop);
        expect(play.state).toBe('idle');
        expect(playOrStop.label).toBe('Play');
    });

    test('Pause and Step are off with nothing playing, and say why', () => {
        const { runner, session, play, requireCommand } = buildPlayTestSession();

        runner.run(requireCommand('play.pauseOrResume'));
        expect(session.status.current).toBe(NOT_PLAYING_REASON);

        runner.run(requireCommand('play.step'));
        expect(session.status.current).toBe(NOT_PAUSED_REASON);
        expect(play.state).toBe('idle');
    });

    test('Pause pauses and resumes, and Step runs exactly one tick while paused', async () => {
        const built = buildPlayTestSession();
        const { runner, play, requireCommand, nextFrame } = built;
        const pauseOrResume = requireCommand('play.pauseOrResume');
        await built.startPlaying();
        await nextFrame();

        runner.run(pauseOrResume);
        expect(play.state).toBe('paused');
        expect(pauseOrResume.label).toBe('Resume');
        await nextFrame();
        const tickWhenPaused = play.mirror?.tick ?? -1;
        await nextFrame();
        expect(play.mirror?.tick).toBe(tickWhenPaused);

        runner.run(requireCommand('play.step'));
        await nextFrame();
        await nextFrame();
        expect(play.mirror?.tick).toBe(tickWhenPaused + 1);

        runner.run(pauseOrResume);
        expect(play.state).toBe('playing');
        expect(pauseOrResume.label).toBe('Pause');
    });

    test('during play every other command shows "Stop to edit" and changes nothing', async () => {
        const built = buildPlayTestSession();
        const { session, registry, runner, play, square, requireCommand } = built;
        session.openLevel.selection.replace([square.id]);
        runner.run(requireCommand('edit.delete'));
        runner.run(requireCommand('edit.undo'));
        const before = editorSnapshot(built);
        expect(before.undoCount).toBe(0);
        expect(before.redoCount).toBe(1);
        await built.startPlaying();

        const others = registry.all.filter((command) => command.runsDuringPlay !== true);
        expect(others.length).toBeGreaterThan(30);
        for (const command of others) {
            play.hint.show('');
            runner.run(command);

            expect(play.hint.current, command.id).toBe(STOP_TO_EDIT_TEXT);
        }

        expect(editorSnapshot(built)).toEqual(before);
        expect(play.state).toBe('playing');
    });

    test('during play a copy or paste from the browser is left to the browser and changes nothing', async () => {
        const built = buildPlayTestSession();
        const { registry, runner, session, square } = built;
        session.openLevel.selection.replace([square.id]);
        const events = new ClipboardEvents(registry, runner);
        const before = editorSnapshot(built);
        await built.startPlaying();

        expect(events.paste('anything')).toBe(false);
        expect(events.cut()).toBeUndefined();
        expect(events.copy()).toBeUndefined();
        expect(editorSnapshot(built)).toEqual(before);
    });

    test('after Stop, Undo and Redo work again', async () => {
        const built = buildPlayTestSession();
        const { session, runner, play, square, requireCommand } = built;
        session.openLevel.selection.replace([square.id]);
        runner.run(requireCommand('edit.delete'));
        await built.startPlaying();
        runner.run(requireCommand('edit.undo'));
        expect(session.openLevel.history.undoCount).toBe(1);

        play.stop();
        runner.run(requireCommand('edit.undo'));
        expect(session.openLevel.history.undoCount).toBe(0);
        runner.run(requireCommand('edit.redo'));
        expect(session.openLevel.history.undoCount).toBe(1);
    });
});
