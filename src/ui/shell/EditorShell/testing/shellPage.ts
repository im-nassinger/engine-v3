import { createElement } from 'react';
import { Level } from '../../../../core/level/index.ts';
import { OpenWindowCount } from '../../../../editor/tools/index.ts';
import { LevelViewMountContext } from '../../../level-view-host/index.ts';
import type { LevelViewMount } from '../../../level-view-host/index.ts';
import { MinimapMountContext } from '../../../minimap/index.ts';
import { OpenWindowsContext } from '../../../open-windows/index.ts';
import { EditorShell } from '../EditorShell.tsx';
import { showWithEditor } from '../../../testing/editorPage.ts';

// The shell without a canvas: the level view isn't what these tests look at.
const NO_LEVEL_VIEW: LevelViewMount = {
    mount: () => {},
    unmount: () => {},
};

// The whole editor's islands on a page opened with openEditorPage.
export function showShell(level = Level.createNew()) {
    const shell = createElement(EditorShell);
    const withMinimap = createElement(MinimapMountContext, { value: NO_LEVEL_VIEW }, shell);
    const withView = createElement(LevelViewMountContext, { value: NO_LEVEL_VIEW }, withMinimap);
    const withWindows = createElement(OpenWindowsContext, { value: new OpenWindowCount() }, withView);

    return showWithEditor(level, withWindows);
}
