import { ShapeComponent, StyleComponent, TriggerComponent } from '../../../../core/components/index.ts';
import type { Point } from '../../../../core/geometry/index.ts';
import type { Entity, Level } from '../../../../core/level/index.ts';
import type { WorldMatrixCache } from '../../../../core/derived/index.ts';
import type { ViewState } from '../../../../editor/view/index.ts';
import { isHiddenWithParents } from '../hiddenWithParents.ts';
import { shapeOutline } from '../selection/shapeOutline.ts';

// The bolt is this share of the shape's inradius on screen tall, so it grows and shrinks with the shape and
// the zoom, and is left out when it would be under BOLT_MIN_PX.
export const BOLT_SHARE_OF_INRADIUS = 0.9;
export const BOLT_MIN_PX = 10;

// Room around the view, so an edge just off screen still draws its part on it.
const OFF_SCREEN_MARGIN_PX = 2;

// One shape with no StyleComponent as the editor draws it, in screen pixels.
export type UnstyledShapePlan = {
    readonly entity: Entity;
    readonly points: readonly Point[];
    // A line is open, and has no fill.
    readonly isClosed: boolean;
    // The bolt in a trigger's middle, or undefined for a shape with no TriggerComponent, a line, or a shape
    // too small on screen to hold one.
    readonly bolt: BoltPlan | undefined;
};

export type BoltPlan = {
    readonly centre: Point;
    readonly heightPx: number;
};

export type UnstyledShapeScene = {
    readonly level: Level;
    readonly view: ViewState;
    readonly worldMatrices: WorldMatrixCache;
};

// Every shape with no StyleComponent that is shown and on screen, in draw order, such as a trigger or an
// invisible ground piece under painted children. Only a trigger gets the bolt (owner, 2026-11-27). A path with
// no StyleComponent is left to the level's own thin line.
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

        let bolt: BoltPlan | undefined;
        const isTrigger = entity.hasComponent(TriggerComponent);
        if (outline.isClosed && isTrigger) {
            bolt = boltIn(points);
        }

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

// The bolt sits on the outline's centroid. Its size comes from twice the area over the perimeter, the
// inradius of a rectangle, a circle or any shape a circle fits snugly in, so a long thin trigger gets a bolt
// that fits its short side, at any rotation.
function boltIn(points: readonly Point[]): BoltPlan | undefined {
    let doubledArea = 0;
    let perimeter = 0;
    let weightedX = 0;
    let weightedY = 0;

    points.forEach((point, i) => {
        const next = points[(i + 1) % points.length] ?? point;
        const cross = point.x * next.y - next.x * point.y;
        doubledArea += cross;
        weightedX += (point.x + next.x) * cross;
        weightedY += (point.y + next.y) * cross;
        perimeter += Math.hypot(next.x - point.x, next.y - point.y);
    });

    if (doubledArea === 0 || perimeter === 0) return undefined;

    const heightPx = (Math.abs(doubledArea) / perimeter) * BOLT_SHARE_OF_INRADIUS;
    if (heightPx < BOLT_MIN_PX) return undefined;

    const centre = { x: weightedX / (3 * doubledArea), y: weightedY / (3 * doubledArea) };
    return { centre, heightPx };
}
