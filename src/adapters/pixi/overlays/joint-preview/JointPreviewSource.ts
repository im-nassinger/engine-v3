import type { JointType } from '../../../../core/components/index.ts';
import type { Unsubscribe } from '../../../../core/events/index.ts';
import type { Point } from '../../../../core/geometry/index.ts';
import type { Entity } from '../../../../core/level/index.ts';

// The Joint tool's preview, in level positions: the ends placed so far, the snapped mouse, the entities a
// click would join and the label. b is null for the background, and undefined while nothing is chosen for it.
export type ShownJointPreview = {
    readonly type: JointType;
    readonly ends: readonly Point[];
    readonly mouse: Point;
    readonly a: Entity | undefined;
    readonly b: Entity | null | undefined;
    readonly label: string | undefined;
};

// What the joint preview overlay reads: the Joint tool's preview while it is the active tool, and the
// joints that show thin lines to their two entities, those selected or under the mouse. The composition
// root builds it from the tools and the selection.
export type JointPreviewSource = {
    readonly preview: ShownJointPreview | undefined;
    readonly linkedJoints: readonly Entity[];
    // Either of the above changed.
    subscribe(listener: () => void): Unsubscribe;
};
