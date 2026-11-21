import type { GradientSource, ShownGradient } from '../adapters/pixi/index.ts';
import { VersionCounter } from '../core/events/index.ts';
import type { Unsubscribe } from '../core/events/index.ts';
import type { EditorSession } from '../editor/session/index.ts';
import { SelectTool } from '../editor/tools/index.ts';
import type { GradientHandles, ToolController } from '../editor/tools/index.ts';

// The Select tool's gradient handles, built from the selection, the caches and the card folds, for the
// level view's gradient handle overlay. It follows New and Import, and changes when the selection, the card
// folds, the active tool or its preview does. A changed fill redraws through the level's own changes.
export class EditorGradientSource implements GradientSource {
    private readonly tools: ToolController;
    private readonly changed = new VersionCounter();
    private stopFollowingSelection: Unsubscribe | undefined;

    constructor(session: EditorSession, tools: ToolController) {
        this.tools = tools;

        const changed = () => this.changed.increment();
        const followSelection = () => {
            this.stopFollowingSelection?.();
            this.stopFollowingSelection = session.openLevel.selection.version.subscribe(changed);
        };

        followSelection();
        session.openLevelChanged.subscribe(() => {
            followSelection();
            changed();
        });
        session.cardFolds.version.subscribe(changed);
        tools.version.subscribe(changed);
        for (const tool of tools.tools) {
            tool.preview.subscribe(changed);
        }
    }

    get gradient() {
        const active = this.tools.active;
        if (!(active instanceof SelectTool)) return undefined;

        const handles = active.gradientHandles;

        return handles === undefined ? undefined : shownGradientOf(handles);
    }

    subscribe(listener: () => void) {
        return this.changed.subscribe(listener);
    }
}

export function shownGradientOf(handles: GradientHandles): ShownGradient {
    const [from, to] = handles.handles;
    const { fill, placement } = handles;
    const edge =
        fill.kind === 'radial'
            ? {
                  centre: placement.shareToOwn(fill.centre),
                  radiusX: fill.radius * placement.box.width,
                  radiusY: fill.radius * placement.box.height,
                  toLevel: placement.toLevel,
              }
            : undefined;

    return { from, to, stops: handles.stopDots, edge };
}
