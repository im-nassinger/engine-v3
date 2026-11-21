import type { Point } from '../../../../core/geometry/index.ts';
import { editablePointsOf } from '../../../commands/index.ts';

import { PointEditState } from './PointEditState.ts';
import type { SelectStateHost } from './SelectState.ts';

// The requirement's double-click table. The first click of the two has already selected what it hit.
// A polygon, line or path goes into point editing, except a Rope's or Spring's path, which only selects.
export function doubleClick(host: SelectStateHost, point: Point) {
    const { selection, currentGroup, level } = host.context.openLevel;
    const { hit, selectable } = host.picker.targetAt(point);

    // Empty space inside a group, or anything outside it: go up one group, selecting the group left.
    if (hit === undefined || selectable === undefined) {
        const left = currentGroup.exitOne();
        if (left !== undefined) {
            selection.replace([left.id]);
        }
        return;
    }

    // A group is hit only through its children, so the hit being deeper than what it selects means a group.
    const goesInside = selectable !== hit || selectable === level.camera;
    if (!goesInside) {
        selection.replace([selectable.id]);
        if (editablePointsOf(selectable) !== undefined) {
            host.goTo(new PointEditState(host, selectable));
        }
        return;
    }

    currentGroup.enter(selectable);

    // The child under the mouse, so another double-click goes one deeper.
    const inside = host.picker.targetAt(point).selectable;
    if (inside === undefined) {
        selection.clear();
    } else {
        selection.replace([inside.id]);
    }
}
