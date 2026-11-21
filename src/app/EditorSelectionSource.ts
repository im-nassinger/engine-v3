import type { SelectionSource } from '../adapters/pixi/index.ts';
import { VersionCounter } from '../core/events/index.ts';
import type { Unsubscribe } from '../core/events/index.ts';
import type { Entity } from '../core/level/index.ts';
import type { EditorSession } from '../editor/session/index.ts';
import { SelectTool, ShapeTool } from '../editor/tools/index.ts';
import type { ToolController } from '../editor/tools/index.ts';

// The open level's selection and what the active tool shows of it, for the level view's selection overlay.
// It follows New and Import, and changes when the selection, the active tool or its preview does.
export class EditorSelectionSource implements SelectionSource {
    private readonly session: EditorSession;
    private readonly tools: ToolController;
    private readonly changed = new VersionCounter();
    private stopFollowingSelection: Unsubscribe | undefined;

    constructor(session: EditorSession, tools: ToolController) {
        this.session = session;
        this.tools = tools;

        const changed = () => this.changed.increment();
        this.followSelection();
        session.openLevelChanged.subscribe(() => {
            this.followSelection();
            changed();
        });
        tools.version.subscribe(changed);
        for (const tool of tools.tools) {
            tool.preview.subscribe(changed);
        }
    }

    get entities() {
        return this.session.openLevel.selection.entities;
    }

    get frame() {
        return this.selectTool?.frame;
    }

    get selectionBox() {
        return this.selectTool?.selectionBox;
    }

    // The Select tool's drags and the Shape tool's size both show here.
    get readout() {
        const active = this.tools.active;
        const hasReadout = active instanceof SelectTool || active instanceof ShapeTool;

        return hasReadout ? active.readout : undefined;
    }

    get editedPoints() {
        const edited = this.selectTool?.editedPoints;
        if (edited === undefined) return undefined;

        return { points: edited.levelPoints(), corners: edited.corners(), selected: edited.selectedIndexes };
    }

    isHidden(entity: Entity) {
        return this.session.openLevel.caches.hidden.isHidden(entity);
    }

    isLocked(entity: Entity) {
        return this.session.openLevel.caches.hidden.isLocked(entity);
    }

    subscribe(listener: () => void) {
        return this.changed.subscribe(listener);
    }

    private get selectTool() {
        const active = this.tools.active;

        return active instanceof SelectTool ? active : undefined;
    }

    private followSelection() {
        this.stopFollowingSelection?.();
        const selection = this.session.openLevel.selection;
        this.stopFollowingSelection = selection.version.subscribe(() => this.changed.increment());
    }
}
