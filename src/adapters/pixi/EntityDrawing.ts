import { Matrix } from 'pixi.js';
import type { Graphics, StrokeStyle } from 'pixi.js';
import { PathComponent, ShapeComponent, StyleComponent } from '../../core/components/index.ts';
import type { Entity } from '../../core/level/index.ts';
import type {
    Matrix2D,
    PathGeometry,
    PathPoint,
    Point,
    ShapeGeometry,
    ShapePiecesResult,
} from '../../core/geometry/index.ts';
import { outlineStretchOf } from '../../core/derived/index.ts';
import type { PiecesCache } from '../../core/derived/index.ts';
import { toPixiColour } from './PixiColour.ts';

export type EntityDrawingOptions = {
    // The editor shows a shape or path with no StyleComponent as a thin line; play shows nothing.
    readonly showUnstyled: boolean;
};

// The thin line for a shape or path with no StyleComponent: 1 screen pixel at any zoom.
const UNSTYLED_LINE: StrokeStyle = { color: 0x1d2430, alpha: 0.6, width: 1, pixelLine: true };
const IDENTITY = new Matrix();

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

// Traces into a Graphics, each point first moved by a stretch when there is one. A stretched circle is
// traced as points, because a stretch with skew makes an ellipse Pixi can't draw turned.
class Pen {
    private readonly graphics: Graphics;
    private readonly stretch: Matrix2D | undefined;

    constructor(graphics: Graphics, stretch: Matrix2D | undefined) {
        this.graphics = graphics;
        this.stretch = stretch;
    }

    moveTo(point: Point) {
        const placed = this.place(point);
        this.graphics.moveTo(placed.x, placed.y);
    }

    lineTo(point: Point) {
        const placed = this.place(point);
        this.graphics.lineTo(placed.x, placed.y);
    }

    // A stretch moves a curve's control points exactly where it moves the curve.
    curveTo(firstControl: Point, secondControl: Point, to: Point) {
        const first = this.place(firstControl);
        const second = this.place(secondControl);
        const placedTo = this.place(to);
        this.graphics.bezierCurveTo(first.x, first.y, second.x, second.y, placedTo.x, placedTo.y);
    }

    closePath() {
        this.graphics.closePath();
    }

    // A circle centred on the shape's own origin.
    circle(radius: number) {
        if (this.stretch === undefined) {
            this.graphics.circle(0, 0, radius);
            return;
        }

        const points = circlePoints(radius, this.stretch);
        this.traceClosed(points);
    }

    tracePoints(points: readonly Point[]) {
        const first = points[0];
        if (first === undefined) return;

        this.moveTo(first);
        for (const point of points.slice(1)) {
            this.lineTo(point);
        }
    }

    traceClosed(points: readonly Point[]) {
        this.tracePoints(points);
        this.closePath();
    }

    private place(point: Point) {
        if (this.stretch === undefined) return point;

        return this.stretch.apply(point);
    }
}

// About one corner every 4 px of the stretched circle's edge, which looks round at any zoom the editor
// draws it at, and never fewer than 32.
const CIRCLE_CORNER_SPACING_PX = 4;
const MIN_CIRCLE_CORNERS = 32;
const MAX_CIRCLE_CORNERS = 1_024;

function circlePoints(radius: number, stretch: Matrix2D) {
    const stretchedEdge = 2 * Math.PI * radius * stretch.largestStretch();
    const wantedCorners = Math.ceil(stretchedEdge / CIRCLE_CORNER_SPACING_PX);
    const corners = Math.min(Math.max(wantedCorners, MIN_CIRCLE_CORNERS), MAX_CIRCLE_CORNERS);

    const points: Point[] = [];
    for (let index = 0; index < corners; index += 1) {
        const angle = (index / corners) * 2 * Math.PI;
        points.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
    }

    return points;
}

function traceFilledOutlines(pen: Pen, result: ShapePiecesResult) {
    for (const outline of result.filledOutlines) {
        pen.traceClosed(outline);
    }

    // A circle has no filled outline: its one piece is the circle itself.
    for (const piece of result.pieces) {
        if (piece.kind !== 'circle') continue;

        pen.circle(piece.radius);
    }
}

// The outline follows the shape's own points, so a self-crossing polygon shows its crossings. A rectangle
// follows its filled outline and a circle its circle piece, the same shapes they collide with.
function traceShapeOutline(pen: Pen, geometry: ShapeGeometry, result: ShapePiecesResult) {
    switch (geometry.kind) {
        case 'polygon':
            pen.traceClosed(geometry.points);
            return;
        case 'line':
            pen.tracePoints(geometry.points);
            return;
        default:
            traceFilledOutlines(pen, result);
            return;
    }
}

function drawShape(graphics: Graphics, pen: Pen, shape: ShapeComponent, look: Look, result: ShapePiecesResult) {
    const geometry = shape.get('geometry');

    const canFill = geometry.kind !== 'line';
    if (canFill && look.fill !== undefined) {
        traceFilledOutlines(pen, result);
        graphics.fill(look.fill);
    }

    if (look.stroke !== undefined) {
        traceShapeOutline(pen, geometry, result);
        graphics.stroke(look.stroke);
    }
}

function traceCurve(pen: Pen, from: PathPoint, to: PathPoint) {
    const isStraight = from.handleOut === null && to.handleIn === null;
    if (isStraight) {
        pen.lineTo(to);
        return;
    }

    const handleOut = from.handleOut ?? { x: 0, y: 0 };
    const handleIn = to.handleIn ?? { x: 0, y: 0 };
    const firstControl = { x: from.x + handleOut.x, y: from.y + handleOut.y };
    const secondControl = { x: to.x + handleIn.x, y: to.y + handleIn.y };

    pen.curveTo(firstControl, secondControl, to);
}

function tracePath(pen: Pen, path: PathGeometry) {
    const first = path.points[0];
    if (first === undefined) return;

    pen.moveTo(first);

    let previous = first;
    for (const point of path.points.slice(1)) {
        traceCurve(pen, previous, point);
        previous = point;
    }

    if (!path.closed) return;

    traceCurve(pen, previous, first);
    pen.closePath();
}

function drawPath(graphics: Graphics, pen: Pen, pathComponent: PathComponent, look: Look) {
    const path = pathComponent.get('path');
    const hasEnoughPoints = path.points.length >= 2;
    if (!hasEnoughPoints) return;

    // Only a closed path can be filled.
    if (path.closed && look.fill !== undefined) {
        tracePath(pen, path);
        graphics.fill(look.fill);
    }

    if (look.stroke !== undefined) {
        tracePath(pen, path);
        graphics.stroke(look.stroke);
    }
}

// With Scale outline off, the drawing is traced stretched by the entity's own scale and skew, and the
// Graphics undoes them, so the shape lands where it would and only the outline's width stays unstretched.
function placeGraphics(graphics: Graphics, unstretch: Matrix2D | undefined) {
    if (unstretch === undefined) {
        graphics.setFromMatrix(IDENTITY);
        return;
    }

    const matrix = new Matrix(unstretch.a, unstretch.b, unstretch.c, unstretch.d, unstretch.tx, unstretch.ty);
    graphics.setFromMatrix(matrix);
}

// Builds what one entity draws into its Graphics, in the entity's own space. Each entity draws one
// thing: a path before a shape (text, v2, will come before both).
export class EntityDrawing {
    static draw(graphics: Graphics, entity: Entity, pieces: PiecesCache, options: EntityDrawingOptions) {
        graphics.clear();
        graphics.alpha = 1;
        placeGraphics(graphics, undefined);

        const pathComponent = entity.getComponent(PathComponent);
        const shape = entity.getComponent(ShapeComponent);
        if (pathComponent === undefined && shape === undefined) return;

        const style = entity.getComponent(StyleComponent);
        const look = lookOf(style, options);
        if (look === undefined) return;

        graphics.alpha = look.opacity;

        const outlineStretch = look.stroke === undefined ? undefined : outlineStretchOf(entity);
        placeGraphics(graphics, outlineStretch?.unstretch);
        const pen = new Pen(graphics, outlineStretch?.stretch);

        if (pathComponent !== undefined) {
            drawPath(graphics, pen, pathComponent, look);
            return;
        }

        if (shape === undefined) return;

        const result = pieces.piecesOf(entity);
        if (result === undefined) return;

        drawShape(graphics, pen, shape, look, result);
    }
}
