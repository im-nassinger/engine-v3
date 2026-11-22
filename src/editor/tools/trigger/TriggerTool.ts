import { createTrigger } from '../../commands/index.ts';
import { ShapeTool } from '../shape/ShapeTool.ts';
import type { LevelPointerInput, Tool, ToolContext, ToolKey } from '../Tool.ts';

// Draws a rectangle that notices touching. It is the Shape tool held to rectangles, so the drag, the click
// that places the remembered size, the readout, snapping and the Z, X and W, A, S, D keys all work as
// there; on release createTrigger makes the entity in one step, and the controller selects it and returns
// to Select unless the tool is locked. Its remembered size is its own. It has no kinds menu.
export class TriggerTool implements Tool {
    readonly id = 'trigger';
    private readonly shapeTool = new ShapeTool(createTrigger);

    get preview() {
        return this.shapeTool.preview;
    }

    // The faded rectangle over the level, for the overlay.
    get drawing() {
        return this.shapeTool.drawing;
    }

    // The size of the drag in progress, for the overlay.
    get readout() {
        return this.shapeTool.readout;
    }

    activate(context: ToolContext) {
        this.shapeTool.activate(context);
    }

    deactivate() {
        this.shapeTool.deactivate();
    }

    pointerDown(input: LevelPointerInput) {
        this.shapeTool.pointerDown(input);
    }

    pointerMove(input: LevelPointerInput) {
        this.shapeTool.pointerMove(input);
    }

    pointerUp(input: LevelPointerInput) {
        this.shapeTool.pointerUp(input);
    }

    keyDown(key: ToolKey) {
        return this.shapeTool.keyDown(key);
    }

    keyUp(key: ToolKey) {
        this.shapeTool.keyUp(key);
    }

    undoDrawingStep() {
        return this.shapeTool.undoDrawingStep();
    }

    cancel() {
        return this.shapeTool.cancel();
    }
}
