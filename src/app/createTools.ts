import type { CommandRegistry } from '../editor/commands/index.ts';
import type { EditorSession } from '../editor/session/index.ts';
import { GridSnapper } from '../editor/snapping/index.ts';
import { PanGesture, SelectTool, ShapeTool, ToolController } from '../editor/tools/index.ts';

// v1's tools: Select and Shape now, Joint with its stage. The snapper is made again for each
// level that opens, since it reads that level's grid.
export function createTools(session: EditorSession, commands: CommandRegistry) {
    let snapperLevel = session.openLevel.level;
    let snapper = new GridSnapper(snapperLevel.editorData, session.viewSettings);
    const services = {
        get openLevel() {
            return session.openLevel;
        },
        get snapper() {
            const level = session.openLevel.level;
            if (level !== snapperLevel) {
                snapperLevel = level;
                snapper = new GridSnapper(level.editorData, session.viewSettings);
            }

            return snapper;
        },
        view: session.view,
        commands,
        status: session.status,
        reader: session.reader,
    };
    const pan = new PanGesture(session.view);

    return new ToolController([new SelectTool(), new ShapeTool()], services, pan);
}
