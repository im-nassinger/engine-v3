import type { DrawingSource } from '../adapters/pixi/index.ts';
import { VersionCounter } from '../core/events/index.ts';
import { PenTool, ShapeTool } from '../editor/tools/index.ts';
import type { ToolController } from '../editor/tools/index.ts';

// The Shape tool's or the pen's preview while it is the active tool, for the level view's drawing preview overlay. It
// changes when the active tool or its preview does.
export class EditorDrawingSource implements DrawingSource {
    private readonly tools: ToolController;
    private readonly changed = new VersionCounter();

    constructor(tools: ToolController) {
        this.tools = tools;

        const changed = () => this.changed.increment();
        tools.version.subscribe(changed);
        for (const tool of tools.tools) {
            tool.preview.subscribe(changed);
        }
    }

    get shape() {
        return this.shapeTool?.drawing;
    }

    get polygon() {
        return this.shapeTool?.polygonDrawing;
    }

    get pen() {
        const active = this.tools.active;

        return active instanceof PenTool ? active.penDrawing : undefined;
    }

    subscribe(listener: () => void) {
        return this.changed.subscribe(listener);
    }

    private get shapeTool() {
        const active = this.tools.active;

        return active instanceof ShapeTool ? active : undefined;
    }
}
