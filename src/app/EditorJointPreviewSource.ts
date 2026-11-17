import type { JointPreviewSource, ShownJointPreview } from '../adapters/pixi/index.ts';
import { JointComponent } from '../core/components/index.ts';
import { VersionCounter } from '../core/events/index.ts';
import type { Unsubscribe } from '../core/events/index.ts';
import type { Entity, EntityId, Level } from '../core/level/index.ts';
import type { EditorSession } from '../editor/session/index.ts';
import { JointTool, SelectTool } from '../editor/tools/index.ts';
import type { MousePosition, ToolController } from '../editor/tools/index.ts';

// The Joint tool's preview while it is the active tool, and the joints that show thin lines to their two
// entities: the selected ones, and the Select tool's frontmost hit under the mouse when it is a joint. It
// changes when the active tool, its preview, the selection or the hovered joint does.
export class EditorJointPreviewSource implements JointPreviewSource {
    private readonly session: EditorSession;
    private readonly tools: ToolController;
    private readonly mouse: MousePosition;
    private readonly changed = new VersionCounter();
    private stopFollowingSelection: Unsubscribe | undefined;
    private hovered: Entity | undefined;

    constructor(session: EditorSession, tools: ToolController, mouse: MousePosition) {
        this.session = session;
        this.tools = tools;
        this.mouse = mouse;

        const changed = () => this.changed.increment();
        this.followSelection();
        session.openLevelChanged.subscribe(() => {
            this.followSelection();
            this.findHovered();
            changed();
        });
        tools.version.subscribe(() => {
            this.findHovered();
            changed();
        });
        for (const tool of tools.tools) {
            tool.preview.subscribe(changed);
        }
        // The mouse moves often, so only a change of the joint under it draws again.
        mouse.version.subscribe(() => {
            if (this.findHovered()) {
                changed();
            }
        });
    }

    get preview(): ShownJointPreview | undefined {
        const active = this.tools.active;
        if (!(active instanceof JointTool)) return undefined;

        const drawing = active.drawing;
        if (drawing === undefined) return undefined;

        const level = this.session.openLevel.level;
        const b = drawing.b === null ? null : entityOf(level, drawing.b);

        return { ...drawing, a: entityOf(level, drawing.a), b };
    }

    get linkedJoints() {
        const { selection, caches } = this.session.openLevel;
        const joints = selection.entities.filter((entity) => entity.hasComponent(JointComponent));
        const hovered = this.hovered;
        if (hovered !== undefined && !joints.includes(hovered)) {
            joints.push(hovered);
        }

        return joints.filter((joint) => !caches.hidden.isHidden(joint));
    }

    subscribe(listener: () => void) {
        return this.changed.subscribe(listener);
    }

    // True when the hovered joint changed.
    private findHovered() {
        const next = this.jointUnderMouse();
        if (next === this.hovered) return false;

        this.hovered = next;
        return true;
    }

    private jointUnderMouse() {
        const point = this.mouse.current;
        if (point === undefined || !(this.tools.active instanceof SelectTool)) return undefined;

        const { hitTester, currentGroup } = this.session.openLevel;
        const probe = { zoom: this.session.view.zoom, currentGroup: currentGroup.group };
        const hit = hitTester.topmostAt(point, probe);
        if (hit === undefined || !hit.hasComponent(JointComponent)) return undefined;

        return hit;
    }

    private followSelection() {
        this.stopFollowingSelection?.();
        const selection = this.session.openLevel.selection;
        this.stopFollowingSelection = selection.version.subscribe(() => this.changed.increment());
    }
}

function entityOf(level: Level, id: EntityId | undefined) {
    if (id === undefined) return undefined;

    return level.findEntity(id);
}
