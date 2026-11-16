import { createElement } from 'react';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import type { Level } from '../../core/level/index.ts';
import { CommandRunner, createCommandRegistry } from '../../editor/commands/index.ts';
import { SaveIndicator, SaveState } from '../../editor/saving/index.ts';
import { EditorSession } from '../../editor/session/index.ts';
import { ManualClock, ManualFrames, ManualTimer } from '../../editor/time/testing/index.ts';
import { CommandsContext } from '../commands/index.ts';
import type { EditorCommands } from '../commands/index.ts';
import { EditorContext } from '../EditorContext.tsx';
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

// The element with everything the page gives a component: the session, the commands, the tools and the
// save state, on frames and a timer the test runs itself.
export function showWithEditor(level: Level, shown: ReactElement) {
    const frames = new ManualFrames();
    const timer = new ManualTimer(new ManualClock());
    const session = new EditorSession({ level, clock: timer.clock, timer, frames });
    const commands: EditorCommands = {
        registry: createCommandRegistry(session),
        runner: new CommandRunner(session.status),
        platform: 'other',
    };
    const tools = buildEditorTools(session, commands.registry, frames);
    const saveIndicator = new SaveIndicator({ state: new SaveState(), mode: 'autosave', failureText: () => undefined });

    const withTools = createElement(ToolsContext, { value: tools }, shown);
    const withCommands = createElement(CommandsContext, { value: commands }, withTools);
    const withSaving = createElement(SaveIndicatorContext, { value: saveIndicator }, withCommands);
    const withSession = createElement(EditorContext, { value: session }, withSaving);
    root.render(withSession);

    return { session, commands, tools, frames, timer, saveIndicator };
}
