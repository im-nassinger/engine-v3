import { ShapeComponent, StyleComponent } from '../../../../core/components/index.ts';
import type { Point } from '../../../../core/geometry/index.ts';
import type { Entity, Level } from '../../../../core/level/index.ts';
import type { WorldMatrixCache } from '../../../../core/derived/index.ts';
import type { ViewState } from '../../../../editor/view/index.ts';
import { isHiddenWithParents } from '../hiddenWithParents.ts';
import { shapeOutline } from '../selection/shapeOutline.ts';

// The bolt sits this far right of and below the top left of the shape's box on screen.
export const BOLT_INSET_PX = 6;

// Room around the view, so an edge just off screen still draws its part on it.
const OFF_SCREEN_MARGIN_PX = 2;

// One shape with no StyleComponent as the editor draws it, in screen pixels.
export type UnstyledShapePlan = {
    readonly entity: Entity;
    readonly points: readonly Point[];
    // A line is open, and has no fill.
    readonly isClosed: boolean;
    // Where the bolt's 24 px icon grid starts, before it is scaled down.
    readonly bolt: Point;
};

export type UnstyledShapeScene = {
    readonly level: Level;
    readonly view: ViewState;
    readonly worldMatrices: WorldMatrixCache;
};

// Every shape with no StyleComponent that is shown and on screen, in draw order, such as a trigger. A path
// with no StyleComponent is left to the level's own thin line.
export function planUnstyledShapes(scene: UnstyledShapeScene): UnstyledShapePlan[] {
    const plans: UnstyledShapePlan[] = [];
    const { level, view, worldMatrices } = scene;

    for (const entity of level.entitiesInDrawOrder()) {
        const shape = entity.getComponent(ShapeComponent);
        if (shape === undefined || entity.hasComponent(StyleComponent) || isHiddenWithParents(entity)) continue;

        const outline = shapeOutline(shape.get('geometry'), worldMatrices.matrixOf(entity));
        const points = outline.points.map((point) => view.levelToScreen(point));
        const box = screenBox(points);
        if (box === undefined || isOffScreen(box, view)) continue;

        const bolt = { x: box.left + BOLT_INSET_PX, y: box.top + BOLT_INSET_PX };
        plans.push({ entity, points, isClosed: outline.isClosed, bolt });
    }

    return plans;
}

type ScreenBox = { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number };

function screenBox(points: readonly Point[]): ScreenBox | undefined {
    if (points.length === 0) return undefined;

    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);

    return { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) };
}

function isOffScreen(box: ScreenBox, view: ViewState) {
    const { width, height } = view.size;
    const margin = OFF_SCREEN_MARGIN_PX;

    return box.right < -margin || box.bottom < -margin || box.left > width + margin || box.top > height + margin;
}
