import {
    CameraComponent,
    JointComponent,
    PathComponent,
    ShapeComponent,
    StyleComponent,
} from '../../../core/components/index.ts';
import { outlineScaleOf } from '../../../core/derived/index.ts';
import type { DerivedCaches } from '../../../core/derived/index.ts';
import type { Matrix2D, Point } from '../../../core/geometry/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import type { ViewSettings } from '../../view/index.ts';
import { jointIconRadiusPx } from '../../view/index.ts';
import type { HitArea } from './HitArea.ts';
import { JointIconHitArea } from './JointIconHitArea.ts';
import { LocalOutlines } from './LocalOutlines.ts';
import type { OwnSpaceOutlines } from './LocalOutlines.ts';
import { OutlineHitArea } from './OutlineHitArea.ts';

export type HitAreaContext = {
    readonly caches: DerivedCaches;
    readonly settings: ViewSettings;
    // Level pixels per screen pixel at the current zoom.
    readonly levelPerScreenPx: number;
    readonly tolerancePx: number;
};

function hasFill(style: StyleComponent | undefined) {
    if (style === undefined) return false;

    const fill = style.get('fill');
    return fill.kind !== 'none';
}

// The drawn outline's half width in level pixels, or the tolerance when that is wider, so a thin line is
// still easy to hit at any zoom.
function edgeReachOf(entity: Entity, matrix: Matrix2D, context: HitAreaContext) {
    const tolerance = context.tolerancePx * context.levelPerScreenPx;
    const style = entity.getComponent(StyleComponent);
    if (style === undefined) return tolerance;

    const halfOutline = style.get('outlineWidth') / 2;
    const drawnHalfOutline = halfOutline * outlineScaleOf(entity, matrix);

    return Math.max(drawnHalfOutline, tolerance);
}

function inLevel(points: readonly Point[], matrix: Matrix2D) {
    return points.map((point) => matrix.apply(point));
}

function outlineArea(outlines: OwnSpaceOutlines, matrix: Matrix2D, edgeReach: number) {
    const lines = outlines.lines.map((line) => {
        const points = inLevel(line.points, matrix);
        return { points, closed: line.closed };
    });
    const fills = outlines.fills.map((fill) => inLevel(fill, matrix));

    return new OutlineHitArea(lines, fills, edgeReach);
}

function jointArea(entity: Entity, context: HitAreaContext) {
    if (!context.settings.isOn('jointIcons')) return undefined;

    const matrix = context.caches.worldMatrices.matrixOf(entity);
    const centre = { x: matrix.tx, y: matrix.ty };
    const zoom = 1 / context.levelPerScreenPx;
    const radiusPx = Math.max(context.tolerancePx, jointIconRadiusPx(zoom));
    const radius = radiusPx * context.levelPerScreenPx;

    return new JointIconHitArea(centre, radius);
}

// The camera never turns, so its frame is its bounds. Only the frame's edge is hit, never the inside.
function cameraArea(entity: Entity, context: HitAreaContext) {
    if (!context.settings.isOn('cameraFrame')) return undefined;

    const frame = context.caches.bounds.ownBoundsOf(entity);
    if (frame === undefined) return undefined;

    const tolerance = context.tolerancePx * context.levelPerScreenPx;
    const line = { points: frame.corners(), closed: true };

    return new OutlineHitArea([line], [], tolerance);
}

function pathArea(entity: Entity, path: PathComponent, context: HitAreaContext) {
    const style = entity.getComponent(StyleComponent);
    const matrix = context.caches.worldMatrices.matrixOf(entity);
    const geometry = path.get('path');
    const outlines = LocalOutlines.path(geometry, hasFill(style));
    const edgeReach = edgeReachOf(entity, matrix, context);

    return outlineArea(outlines, matrix, edgeReach);
}

function shapeArea(entity: Entity, shape: ShapeComponent, context: HitAreaContext) {
    const pieces = context.caches.pieces.piecesOf(entity);
    if (pieces === undefined) return undefined;

    const style = entity.getComponent(StyleComponent);
    const matrix = context.caches.worldMatrices.matrixOf(entity);
    const geometry = shape.get('geometry');
    const outlines = LocalOutlines.shape(geometry, pieces, hasFill(style));
    const edgeReach = edgeReachOf(entity, matrix, context);

    return outlineArea(outlines, matrix, edgeReach);
}

// The requirement's hit area table, picked in the order an entity picks what it draws. A joint is hit
// only by its icon, even a Rope with its path. undefined when nothing of it can be hit, like a group.
export class HitAreas {
    static of(entity: Entity, context: HitAreaContext): HitArea | undefined {
        if (entity.hasComponent(JointComponent)) return jointArea(entity, context);
        if (entity.hasComponent(CameraComponent)) return cameraArea(entity, context);

        const path = entity.getComponent(PathComponent);
        if (path !== undefined) return pathArea(entity, path, context);

        const shape = entity.getComponent(ShapeComponent);
        if (shape !== undefined) return shapeArea(entity, shape, context);

        return undefined;
    }
}
