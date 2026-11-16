import { VersionCounter } from '../../core/events/index.ts';
import type { EntityId } from '../../core/level/index.ts';

import type { PanGesture } from './pan/PanGesture.ts';
import type { LevelPointerInput, PointerButton, Tool, ToolContext, ToolId, ToolKey } from './Tool.ts';

// What the tools are given, besides the controller's own finished().
export type ToolServices = Omit<ToolContext, 'finished'>;

const SPACE_CODE = 'Space';

// Picks the active tool, keeps tool lock, pans before any tool, and returns to Select after a tool
// makes something.
export class ToolController {
    readonly version = new VersionCounter();
    private readonly toolsById = new Map<ToolId, Tool>();
    private readonly context: ToolContext;
    private readonly pan: PanGesture;
    // The buttons the active tool saw go down and not yet up: its drag.
    private readonly toolButtons = new Set<PointerButton>();
    private current: Tool;
    private locked = false;

    constructor(tools: readonly Tool[], services: ToolServices, pan: PanGesture) {
        for (const tool of tools) {
            if (this.toolsById.has(tool.id)) throw new Error(`Two tools have the id ${tool.id}.`);

            this.toolsById.set(tool.id, tool);
        }

        this.context = buildContext(services, (created) => this.finish(created));
        this.pan = pan;
        this.current = this.requireTool('select');
        this.current.activate(this.context);
    }

    get active() {
        return this.current;
    }

    get isLocked() {
        return this.locked;
    }

    // In the order given, for the toolbar.
    get tools() {
        return [...this.toolsById.values()];
    }

    // A tool button is held, or Space or the middle button is panning.
    get isDragging() {
        return this.toolButtons.size > 0 || this.pan.isPanning;
    }

    // A number key or a button. Picking the active tool again locks it.
    pick(id: ToolId) {
        const tool = this.requireTool(id);

        if (tool === this.current) {
            if (this.locked) return;

            this.locked = true;
            this.version.increment();
            return;
        }

        this.switchTo(tool);
    }

    has(id: ToolId) {
        return this.toolsById.has(id);
    }

    pointerDown(input: LevelPointerInput) {
        if (this.pan.pointerDown(input)) return;

        this.toolButtons.add(input.button);
        this.current.pointerDown(input);
    }

    // While panning during a tool's drag, the tool hears the mouse at its new level position, since
    // the level moved under it.
    pointerMove(input: LevelPointerInput) {
        if (this.pan.pointerMove(input)) {
            if (this.toolButtons.size === 0) return;

            const levelPosition = this.context.view.screenToLevel(input.screenPosition);
            this.current.pointerMove({ ...input, levelPosition });
            return;
        }

        this.current.pointerMove(input);
    }

    // A release the tool never saw go down (one cancelled by Esc) isn't passed on.
    pointerUp(input: LevelPointerInput) {
        if (this.pan.pointerUp(input)) return;
        if (!this.toolButtons.delete(input.button)) return;

        this.current.pointerUp(input);
    }

    // Space pans; a held Space repeating is still used, so the page never scrolls.
    keyDown(key: ToolKey) {
        if (key.code === SPACE_CODE) {
            this.pan.spaceDown();
            return true;
        }

        return this.current.keyDown(key);
    }

    keyUp(key: ToolKey) {
        if (key.code === SPACE_CODE) {
            this.pan.spaceUp();
        }

        this.current.keyUp(key);
    }

    // The window lost focus, so Space's key up goes elsewhere.
    releaseKeys() {
        this.pan.spaceUp();
    }

    // Esc's first step: the tool puts its drag back, and its buttons' releases are ignored.
    cancelDrag() {
        const wasDragging = this.isDragging;

        this.current.cancel();
        this.toolButtons.clear();
        this.pan.release();

        return wasDragging;
    }

    // Esc's third step: the tool's unfinished drawing.
    cancelDrawing() {
        return this.current.cancel();
    }

    // Esc's fourth step. On Select, a lock changes nothing, so it is dropped without taking the Esc.
    returnToSelect() {
        if (this.current.id === 'select') {
            this.unlock();
            return false;
        }

        const select = this.requireTool('select');
        this.switchTo(select);

        return true;
    }

    private finish(created: readonly EntityId[]) {
        this.context.openLevel.selection.replace(created);
        if (this.locked) return;
        if (this.current.id === 'select') return;

        const select = this.requireTool('select');
        this.switchTo(select);
    }

    private switchTo(tool: Tool) {
        this.current.deactivate();
        this.toolButtons.clear();
        this.current = tool;
        this.locked = false;
        tool.activate(this.context);
        this.version.increment();
    }

    private unlock() {
        if (!this.locked) return;

        this.locked = false;
        this.version.increment();
    }

    private requireTool(id: ToolId) {
        const tool = this.toolsById.get(id);
        if (tool === undefined) throw new Error(`No tool has the id ${id}.`);

        return tool;
    }
}

// The services are read through, not copied, so a replaced open level reaches every tool.
function buildContext(services: ToolServices, finished: (created: readonly EntityId[]) => void): ToolContext {
    return {
        get openLevel() {
            return services.openLevel;
        },
        get view() {
            return services.view;
        },
        get snapper() {
            return services.snapper;
        },
        get commands() {
            return services.commands;
        },
        get status() {
            return services.status;
        },
        finished,
    };
}
