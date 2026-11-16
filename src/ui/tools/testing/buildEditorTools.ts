import type { CommandRegistry } from '../../../editor/commands/index.ts';
import type { EditorSession } from '../../../editor/session/index.ts';
import { GridSnapper } from '../../../editor/snapping/index.ts';
import type { FrameScheduler } from '../../../editor/time/index.ts';
import { MousePosition, PanGesture, SelectTool, ShapeTool, ToolController } from '../../../editor/tools/index.ts';
import type { EditorTools } from '../ToolsContext.ts';

// The real tools on a test's session, as the page builds them: Select and Shape, snapping to the open
// level's grid.
export function buildEditorTools(session: EditorSession, commands: CommandRegistry, frames: FrameScheduler) {
    const services = {
        get openLevel() {
            return session.openLevel;
        },
        get snapper() {
            return new GridSnapper(session.openLevel.level.editorData, session.viewSettings);
        },
        view: session.view,
        commands,
        status: session.status,
        reader: session.reader,
    };
    const pan = new PanGesture(session.view);
    const controller = new ToolController([new SelectTool(), new ShapeTool()], services, pan);
    const tools: EditorTools = { controller, mouse: new MousePosition(frames) };

    return tools;
}
