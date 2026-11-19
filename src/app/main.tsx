import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../ui/theme.css';
import { CommandsContext } from '../ui/commands/index.ts';
import type { EditorCommands } from '../ui/commands/index.ts';
import { EditorContext } from '../ui/EditorContext.tsx';
import { LevelViewMountContext } from '../ui/level-view-host/index.ts';
import { MinimapMountContext } from '../ui/minimap/index.ts';
import { OpenWindowsContext } from '../ui/open-windows/index.ts';
import { PlayContext } from '../ui/play/index.ts';
import { SaveIndicatorContext } from '../ui/save-state/index.ts';
import { EditorShell } from '../ui/shell/index.ts';
import { ToolsContext } from '../ui/tools/index.ts';
import type { EditorTools } from '../ui/tools/index.ts';
import { EditorComposition } from './EditorComposition.ts';

function requireElement(id: string) {
    const element = document.getElementById(id);
    if (!element) throw new Error(`The page has no #${id} element.`);

    return element;
}

// The editor first draws in its own font, so no text jumps when the font arrives. Nothing on the page
// uses the font yet, so document.fonts.ready alone wouldn't wait for it.
const FONT_WEIGHTS = ['400', '500', '600'];
const fontLoads = FONT_WEIGHTS.map((weight) => document.fonts.load(`${weight} 12px "JetBrains Mono"`));
await Promise.all(fontLoads);

const composition = await EditorComposition.create();
const root = createRoot(requireElement('root'));
const editorCommands: EditorCommands = {
    registry: composition.commands,
    runner: composition.runner,
    platform: composition.platform,
};
const editorTools: EditorTools = { controller: composition.tools, mouse: composition.mouse };

root.render(
    <StrictMode>
        <EditorContext value={composition.session}>
            <CommandsContext value={editorCommands}>
                <ToolsContext value={editorTools}>
                    <OpenWindowsContext value={composition.openWindows}>
                        <SaveIndicatorContext value={composition.saveIndicator}>
                            <PlayContext value={composition.play}>
                                <LevelViewMountContext value={composition.levelView}>
                                    <MinimapMountContext value={composition.minimap}>
                                        <EditorShell />
                                    </MinimapMountContext>
                                </LevelViewMountContext>
                            </PlayContext>
                        </SaveIndicatorContext>
                    </OpenWindowsContext>
                </ToolsContext>
            </CommandsContext>
        </EditorContext>
    </StrictMode>,
);
