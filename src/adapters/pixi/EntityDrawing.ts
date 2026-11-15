import type { Graphics, StrokeStyle } from 'pixi.js';
import { PathComponent, ShapeComponent, StyleComponent } from '../../core/components/index.ts';
import type { Entity } from '../../core/entities/index.ts';
import type { PathGeometry, PathPoint, Point, ShapeGeometry, ShapePiecesResult } from '../../core/geometry/index.ts';
import type { PiecesCache } from '../../core/derived/index.ts';
import { toPixiColour } from './PixiColour.ts';

export type EntityDrawingOptions = {
    // The editor shows a shape or path with no StyleComponent as a thin line; play shows nothing.
    readonly showUnstyled: boolean;
};

// The thin line for a shape or path with no StyleComponent: 1 screen pixel at any zoom.
const UNSTYLED_LINE: StrokeStyle = { color: 0x1d2430, alpha: 0.6, width: 1, pixelLine: true };

type Look = {
    readonly fill: { readonly color: number; readonly alpha: number } | undefined;
    readonly stroke: StrokeStyle | undefined;
    readonly opacity: number;
};

function lookOf(style: StyleComponent | undefined, options: EntityDrawingOptions): Look | undefined {
    if (style === undefined) {
        if (!options.showUnstyled) return undefined;

        return { fill: undefined, stroke: UNSTYLED_LINE, opacity: 1 };
    }

    const storedFill = style.get('fill');
    const outlineWidth = style.get('outlineWidth');

    let fill: Look['fill'];
    if (storedFill.kind === 'solid') {
        fill = toPixiColour(storedFill.colour);
    }

    // Round joins and caps keep the outline within half its width of the shape, which BoundsCache counts on.
    let stroke: StrokeStyle | undefined;
    if (outlineWidth > 0) {
        const outlineColour = toPixiColour(style.get('outlineColour'));
        stroke = { ...outlineColour, width: outlineWidth, join: 'round', cap: 'round' };
    }

    return { fill, stroke, opacity: style.get('opacity') };
}

function tracePoints(graphics: Graphics, points: readonly Point[]) {
    const first = points[0];
    if (first === undefined) return;

    graphics.moveTo(first.x, first.y);
    for (const point of points.slice(1)) {
        graphics.lineTo(point.x, point.y);
    }
}

function traceClosedOutline(graphics: Graphics, outline: readonly Point[]) {
    tracePoints(graphics, outline);
    graphics.closePath();
}

function traceFilledOutlines(graphics: Graphics, result: ShapePiecesResult) {
    for (const outline of result.filledOutlines) {
        traceClosedOutline(graphics, outline);
    }

    // A circle has no filled outline: its one piece is the circle itself.
    for (const piece of result.pieces) {
        if (piece.kind !== 'circle') continue;

        graphics.circle(0, 0, piece.radius);
    }
}

// The outline follows the shape's own points, so a self-crossing polygon shows its crossings. A rectangle
// and an ellipse follow the filled outline, which is the same points they collide with.
function traceShapeOutline(graphics: Graphics, geometry: ShapeGeometry, result: ShapePiecesResult) {
    switch (geometry.kind) {
        case 'polygon':
            traceClosedOutline(graphics, geometry.points);
            return;
        case 'line':
            tracePoints(graphics, geometry.points);
            return;
        default:
            traceFilledOutlines(graphics, result);
            return;
    }
}

function drawShape(graphics: Graphics, entity: Entity, shape: ShapeComponent, look: Look, pieces: PiecesCache) {
    const geometry = shape.get('geometry');
    const result = pieces.piecesOf(entity);
    if (result === undefined) return;

    const canFill = geometry.kind !== 'line';
    if (canFill && look.fill !== undefined) {
        traceFilledOutlines(graphics, result);
        graphics.fill(look.fill);
    }

    if (look.stroke !== undefined) {
        traceShapeOutline(graphics, geometry, result);
        graphics.stroke(look.stroke);
    }
}

function traceCurve(graphics: Graphics, from: PathPoint, to: PathPoint) {
    const isStraight = from.handleOut === null && to.handleIn === null;
    if (isStraight) {
        graphics.lineTo(to.x, to.y);
        return;
    }

    const handleOut = from.handleOut ?? { x: 0, y: 0 };
    const handleIn = to.handleIn ?? { x: 0, y: 0 };
    const firstControlX = from.x + handleOut.x;
    const firstControlY = from.y + handleOut.y;
    const secondControlX = to.x + handleIn.x;
    const secondControlY = to.y + handleIn.y;

    graphics.bezierCurveTo(firstControlX, firstControlY, secondControlX, secondControlY, to.x, to.y);
}

function tracePath(graphics: Graphics, path: PathGeometry) {
    const first = path.points[0];
    if (first === undefined) return;

    graphics.moveTo(first.x, first.y);

    let previous = first;
    for (const point of path.points.slice(1)) {
        traceCurve(graphics, previous, point);
        previous = point;
    }

    if (!path.closed) return;

    traceCurve(graphics, previous, first);
    graphics.closePath();
}

function drawPath(graphics: Graphics, pathComponent: PathComponent, look: Look) {
    const path = pathComponent.get('path');
    const hasEnoughPoints = path.points.length >= 2;
    if (!hasEnoughPoints) return;

    // Only a closed path can be filled.
    if (path.closed && look.fill !== undefined) {
        tracePath(graphics, path);
        graphics.fill(look.fill);
    }

    if (look.stroke !== undefined) {
        tracePath(graphics, path);
        graphics.stroke(look.stroke);
    }
}

// Builds what one entity draws into its Graphics, in the entity's own space. Each entity draws one
// thing: a path before a shape (text, v2, will come before both).
export class EntityDrawing {
    static draw(graphics: Graphics, entity: Entity, pieces: PiecesCache, options: EntityDrawingOptions) {
        graphics.clear();
        graphics.alpha = 1;

        const pathComponent = entity.getComponent(PathComponent);
        const shape = entity.getComponent(ShapeComponent);
        if (pathComponent === undefined && shape === undefined) return;

        const style = entity.getComponent(StyleComponent);
        const look = lookOf(style, options);
        if (look === undefined) return;

        graphics.alpha = look.opacity;

        if (pathComponent !== undefined) {
            drawPath(graphics, pathComponent, look);
            return;
        }

        if (shape !== undefined) {
            drawShape(graphics, entity, shape, look, pieces);
        }
    }
}
