import { LevelWriter } from '../../../../core/level-data/index.ts';
import { ScriptedEngine } from '../../../../core/simulation/testing/ScriptedPhysics.ts';
import { placeBody, transform } from '../../../../core/simulation/testing/scriptedLevel.ts';
import { PlaySession } from '../../../play/index.ts';
import { DirectGameRunner } from '../../../play/testing/index.ts';
import { ManualFrames, ManualTimer } from '../../../time/testing/index.ts';
import { createCommandRegistry } from '../../createCommandRegistry.ts';
import type { EditorCommand } from '../../EditorCommand.ts';
import { buildFileTestParts } from '../../file/testing/fileTestParts.ts';
import { CommandRunner } from '../../running/CommandRunner.ts';
import { OpenDialog } from '../../running/OpenDialog.ts';

import { buildCommandTestSession } from '../../testing/commandTestSession.ts';

const FRAME_MS = 1000 / 60;

// The command test session with a crate that falls, a PlaySession on a DirectGameRunner, and a registry and
// runner that know it. The test passes in the time fakes it steps.
export function buildPlayTestSession() {
    const timer = new ManualTimer();
    const clock = timer.clock;
    const frames = new ManualFrames();
    const built = buildCommandTestSession(clock, timer, new ManualFrames());
    const { session, level } = built;
    placeBody(level, level.world, transform(0, 0));
    const calls: string[] = [];
    const dialog = new OpenDialog();
    const play = new PlaySession({
        session,
        runner: new DirectGameRunner(new ScriptedEngine()),
        clock,
        timer,
        frames,
        commitTyping: () => calls.push('commit'),
        saveNow: () => {
            calls.push('save');
            return Promise.resolve();
        },
        isDialogOpen: () => dialog.current !== undefined,
    });
    const runner = new CommandRunner(session.status, { dialog, play });
    const registry = createCommandRegistry(session, undefined, buildFileTestParts(session).parts, play);

    function requireCommand(id: string): EditorCommand {
        const command = registry.find(id);
        if (command === undefined) throw new Error(`No command ${id}.`);

        return command;
    }

    async function nextFrame() {
        clock.advance(FRAME_MS);
        frames.runFrame(clock.nowMs());
        await settle();
    }

    // Play, and the run is going once the game has answered.
    async function startPlaying() {
        play.play();
        await settle();
        if (play.state !== 'playing') throw new Error(`The run is ${play.state}, not playing.`);
    }

    return { ...built, play, runner, registry, calls, requireCommand, nextFrame, startPlaying };
}

// Lets every promise already answered run its callbacks.
export async function settle() {
    for (let i = 0; i < 20; i++) {
        await Promise.resolve();
    }
}

export type PlayTestSession = ReturnType<typeof buildPlayTestSession>;

// Everything Stop must give back: the level's data, its history, the selection, the current group and the view.
export function editorSnapshot(built: PlayTestSession) {
    const openLevel = built.session.openLevel;
    const view = built.session.view;

    return {
        data: new LevelWriter().write(openLevel.level),
        undoCount: openLevel.history.undoCount,
        redoCount: openLevel.history.redoCount,
        selection: [...openLevel.selection.entities].map((entity) => entity.id),
        group: openLevel.currentGroup.path,
        view: { zoom: view.zoom, middle: view.middle },
        hidden: [...openLevel.level.entitiesInPanelOrder()].map((entity) => entity.isHidden),
    };
}
