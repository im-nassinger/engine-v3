import { Bounds } from '../../../core/geometry/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import type { ToolContext } from '../Tool.ts';

// The box a drag draws from where it was pressed to the mouse.
export function boxBetween(corner: Point, oppositeCorner: Point) {
    const left = Math.min(corner.x, oppositeCorner.x);
    const top = Math.min(corner.y, oppositeCorner.y);
    const right = Math.max(corner.x, oppositeCorner.x);
    const bottom = Math.max(corner.y, oppositeCorner.y);

    return new Bounds(left, top, right, bottom);
}

// What a press under the mouse lands on: the entity hit, and what a click there selects, seen from the
// group you are inside. Both are missing on empty space; selectable alone is missing outside the group.
export type PressTarget = {
    readonly hit: Entity | undefined;
    readonly selectable: Entity | undefined;
};

// Asks the open level's HitTester with the zoom and the group you are inside at the moment.
export class SelectionPicker {
    private readonly context: ToolContext;

    constructor(context: ToolContext) {
        this.context = context;
    }

    // The group you are inside is never hit: a group that is also a shape would otherwise cover its own
    // children, since a parent is drawn in front of them.
    targetAt(point: Point): PressTarget {
        const { hitTester, currentGroup } = this.context.openLevel;
        const hits = hitTester.allAt(point, this.probe());
        const hit = hits.find((entity) => entity !== currentGroup.group);
        if (hit === undefined) return { hit: undefined, selectable: undefined };

        return { hit, selectable: hitTester.selectableFor(hit, currentGroup.group, false) };
    }

    // Whether anything inside the entity, at any depth, is under the point.
    hasChildAt(entity: Entity, point: Point) {
        const hits = this.context.openLevel.hitTester.allAt(point, this.probe());

        return hits.some((hit) => entity.isAncestorOf(hit));
    }

    // What a selection box selects, front to back, each entity once. With
    // insideGroups (Ctrl) the entities inside groups instead of their groups.
    selectablesInBox(box: Bounds, insideGroups: boolean) {
        const { hitTester, currentGroup } = this.context.openLevel;
        const selectables = new Set<Entity>();

        for (const hit of hitTester.allTouching(box, this.probe())) {
            const selectable = hitTester.selectableFor(hit, currentGroup.group, insideGroups);
            if (selectable === undefined) continue;

            selectables.add(selectable);
        }

        return [...selectables];
    }

    private probe() {
        return { zoom: this.context.view.zoom, currentGroup: this.context.openLevel.currentGroup.group };
    }
}
