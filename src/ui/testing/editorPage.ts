import { createElement } from 'react';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import type { Level } from '../../core/level/index.ts';
import { ScriptedEngine } from '../../core/simulation/testing/ScriptedPhysics.ts';
import { CommandRunner, createCommandRegistry, OpenDialog } from '../../editor/commands/index.ts';
import { HeldKeys, PlaySession } from '../../editor/play/index.ts';
import { DirectGameRunner } from '../../editor/play/testing/index.ts';
import { SAVE_FAILED_TEXT, SaveIndicator, SaveState } from '../../editor/saving/index.ts';
import { EditorSession } from '../../editor/session/index.ts';
import { ManualClock, ManualFrames, ManualTimer } from '../../editor/time/testing/index.ts';
import { CommandsContext } from '../commands/index.ts';
import type { EditorCommands } from '../commands/index.ts';
import { EditorContext } from '../EditorContext.tsx';
import { PlayContext } from '../play/index.ts';
import { SaveIndicatorContext } from '../save-state/index.ts';
import '../theme.css';
import { ToolsContext } from '../tools/index.ts';
import { buildEditorTools } from '../tools/testing/buildEditorTools.ts';

let container: HTMLElement;
let root: Root;

// Before each test: an empty place on the page.
export function openEditorPage() {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
}

// After each test.
export function closeEditorPage() {
    root.unmount();
    container.remove();
}

export function editorPageContainer() {
    return container;
}

// The element with everything the page gives a component: the session, the commands, the tools, the
// save state and test play on a game run in this thread, on frames and a timer the test runs itself.
export function showWithEditor(level: Level, shown: ReactElement) {
    const frames = new ManualFrames();
    const timer = new ManualTimer(new ManualClock());
    const session = new EditorSession({ level, clock: timer.clock, timer, frames });
    const dialog = new OpenDialog();
    const heldKeys = new HeldKeys();
    const play = new PlaySession({
        session,
        runner: new DirectGameRunner(new ScriptedEngine()),
        clock: timer.clock,
        timer,
        frames,
        commitTyping: () => {},
        saveNow: () => Promise.resolve(),
        isDialogOpen: () => dialog.current !== undefined,
        heldKeys,
    });
    const commands: EditorCommands = {
        registry: createCommandRegistry(session, undefined, undefined, play),
        runner: new CommandRunner(session.status, { dialog, play }),
        platform: 'other',
    };
    const tools = buildEditorTools(session, commands.registry, frames);
    const saveIndicator = new SaveIndicator({
        state: new SaveState(),
        mode: 'autosave',
        failureText: () => SAVE_FAILED_TEXT,
    });

    const withTools = createElement(ToolsContext, { value: tools }, shown);
    const withCommands = createElement(CommandsContext, { value: commands }, withTools);
    const withSaving = createElement(SaveIndicatorContext, { value: saveIndicator }, withCommands);
    const withPlay = createElement(PlayContext, { value: play }, withSaving);
    const withSession = createElement(EditorContext, { value: session }, withPlay);
    root.render(withSession);

    return { session, commands, tools, frames, timer, saveIndicator, play, heldKeys };
}
