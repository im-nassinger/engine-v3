import { PathComponent, ShapeComponent, StyleComponent } from '../../../core/components/index.ts';
import type { HiddenCache } from '../../../core/derived/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import type { PathGeometry, Point, ShapePiecesResult } from '../../../core/geometry/index.ts';
import type { LevelDisplayCaches } from '../LevelDisplay.ts';
import { toPixiColour } from '../PixiColour.ts';
import { tracePath } from '../tracePath.ts';
import type { PathPen } from '../tracePath.ts';
import type { MinimapFit } from './minimapFit.ts';

export type MinimapCaches = LevelDisplayCaches & {
    readonly hidden: HiddenCache;
};

// Where level position (0, 0) lands on the picture, with the fit's scale.
export type LevelToPicture = {
    readonly fit: MinimapFit;
    readonly originX: number;
    readonly originY: number;
};

const COLOUR_DIGITS_END = 7;
const FULL_TURN = 2 * Math.PI;

function penOn(context: CanvasRenderingContext2D): PathPen {
    return {
        moveTo: (point: Point) => context.moveTo(point.x, point.y),
        lineTo: (point: Point) => context.lineTo(point.x, point.y),
        curveTo: (first: Point, second: Point, to: Point) => {
            context.bezierCurveTo(first.x, first.y, second.x, second.y, to.x, to.y);
        },
        closePath: () => context.closePath(),
    };
}

function traceOutline(context: CanvasRenderingContext2D, outline: readonly Point[]) {
    const first = outline[0];
    if (first === undefined) return;

    context.moveTo(first.x, first.y);
    for (let index = 1; index < outline.length; index += 1) {
        const point = outline[index];
        if (point === undefined) continue;

        context.lineTo(point.x, point.y);
    }
    context.closePath();
}

function traceShape(context: CanvasRenderingContext2D, result: ShapePiecesResult) {
    for (const outline of result.filledOutlines) {
        traceOutline(context, outline);
    }

    // A circle has no filled outline: its one piece is the circle itself.
    for (const piece of result.pieces) {
        if (piece.kind !== 'circle') continue;

        context.moveTo(piece.radius, 0);
        context.arc(0, 0, piece.radius, 0, FULL_TURN);
    }
}

// What the entity fills, or undefined when it fills nothing. A path comes before a shape, as in the level view.
function fillAreaOf(entity: Entity, caches: MinimapCaches): ShapePiecesResult | PathGeometry | undefined {
    const pathComponent = entity.getComponent(PathComponent);
    if (pathComponent !== undefined) {
        const path = pathComponent.get('path');
        const canFill = path.closed && path.points.length >= 2;

        return canFill ? path : undefined;
    }

    const shape = entity.getComponent(ShapeComponent);
    if (shape === undefined) return undefined;
    if (shape.get('geometry').kind === 'line') return undefined;

    return caches.pieces.piecesOf(entity);
}

function placeEntity(context: CanvasRenderingContext2D, entity: Entity, caches: MinimapCaches, to: LevelToPicture) {
    const matrix = caches.worldMatrices.matrixOf(entity);
    const { scale } = to.fit;
    const offsetX = matrix.tx * scale + to.originX;
    const offsetY = matrix.ty * scale + to.originY;

    context.setTransform(matrix.a * scale, matrix.b * scale, matrix.c * scale, matrix.d * scale, offsetX, offsetY);
}

// One entity's fill, with no outline. Hidden and unstyled entities paint nothing.
export function paintEntityFill(
    context: CanvasRenderingContext2D,
    entity: Entity,
    caches: MinimapCaches,
    to: LevelToPicture,
) {
    if (caches.hidden.isHidden(entity)) return;

    const style = entity.getComponent(StyleComponent);
    if (style === undefined) return;

    const fill = style.get('fill');
    if (fill.kind !== 'solid') return;

    const area = fillAreaOf(entity, caches);
    if (area === undefined) return;

    placeEntity(context, entity, caches, to);
    context.beginPath();
    if ('points' in area) {
        tracePath(penOn(context), area);
    } else {
        traceShape(context, area);
    }

    const { alpha } = toPixiColour(fill.colour);
    context.globalAlpha = alpha * style.get('opacity');
    context.fillStyle = fill.colour.slice(0, COLOUR_DIGITS_END);
    context.fill();
}
