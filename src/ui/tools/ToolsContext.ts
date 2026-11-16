import { createContext, useContext } from 'react';
import type { MousePosition, ToolController } from '../../editor/tools/index.ts';

// What the toolbar, the status bar and the entity field's picker read: the tools, and where the mouse
// is over the level view.
export type EditorTools = {
    readonly controller: ToolController;
    readonly mouse: MousePosition;
};

export const ToolsContext = createContext<EditorTools | undefined>(undefined);

export function useEditorTools() {
    const tools = useContext(ToolsContext);
    if (!tools) throw new Error('useEditorTools needs a ToolsContext provider.');

    return tools;
}
