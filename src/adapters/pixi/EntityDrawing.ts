import { Matrix } from 'pixi.js';
import type { Graphics, StrokeStyle } from 'pixi.js';
import { PathComponent, ShapeComponent, StyleComponent } from '../../core/components/index.ts';
import type { Entity } from '../../core/level/index.ts';
import type { Matrix2D, Point, ShapeGeometry, ShapePiecesResult } from '../../core/geometry/index.ts';
import { fillBoxOf, outlineStretchOf } from '../../core/derived/index.ts';
import type { PiecesCache } from '../../core/derived/index.ts';
import type { Fill } from '../../core/fields/index.ts';
import type { GradientTextures } from './GradientTextures.ts';
import { toPixiColour } from './PixiColour.ts';
import { PixiFill } from './PixiFill.ts';
import { tracePath } from './tracePath.ts';

export type EntityDrawingOptions = {
    // The editor shows a path with no StyleComponent as a thin line; play shows nothing. A shape with none is
    // drawn by UnstyledShapeOverlay instead, in the editor only.
    readonly showUnstyled: boolean;
};

// The thin line for a path with no StyleComponent: 1 screen pixel at any zoom.
const UNSTYLED_LINE: StrokeStyle = { color: 0x1d2430, alpha: 0.6, width: 1, pixelLine: true };
const IDENTITY = new Matrix();

type Look = {
    readonly fill: Fill;
    readonly stroke: StrokeStyle | undefined;
    readonly opacity: number;
};

function lookOf(style: StyleComponent | undefined, options: EntityDrawingOptions): Look | undefined {
    if (style === undefined) {
        if (!options.showUnstyled) return undefined;

        return { fill: { kind: 'none' }, stroke: UNSTYLED_LINE, opacity: 1 };
    }

    const outlineWidth = style.get('outlineWidth');

    // Round joins and caps keep the outline within half its width of the shape, which BoundsCache counts on.
    let stroke: StrokeStyle | undefined;
    if (outlineWidth > 0) {
        const outlineColour = toPixiColour(style.get('outlineColour'));
        stroke = { ...outlineColour, width: outlineWidth, join: 'round', cap: 'round' };
    }

    return { fill: style.get('fill'), stroke, opacity: style.get('opacity') };
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

// What drawing one entity needs besides its components. The fill is made only when one is drawn, so an
// entity holds a gradient's texture only while it shows it.
type DrawingContext = {
    readonly graphics: Graphics;
    readonly pen: Pen;
    readonly look: Look;
    readonly makeFill: () => PixiFill | undefined;
};

function drawShape(context: DrawingContext, shape: ShapeComponent, result: ShapePiecesResult) {
    const { graphics, pen, look } = context;
    const geometry = shape.get('geometry');

    const canFill = geometry.kind !== 'line';
    const fill = canFill ? context.makeFill() : undefined;
    if (fill !== undefined) {
        traceFilledOutlines(pen, result);
        fill.fill(graphics);
    }

    if (look.stroke !== undefined) {
        traceShapeOutline(pen, geometry, result);
        graphics.stroke(look.stroke);
    }
}

function drawPath(context: DrawingContext, pathComponent: PathComponent) {
    const { graphics, pen, look } = context;
    const path = pathComponent.get('path');
    const hasEnoughPoints = path.points.length >= 2;
    if (!hasEnoughPoints) return;

    // Only a closed path can be filled.
    const fill = path.closed ? context.makeFill() : undefined;
    if (fill !== undefined) {
        tracePath(pen, path);
        fill.fill(graphics);
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

// What one drawing needs from the display it is drawn for.
export type EntityDrawingParts = {
    readonly pieces: PiecesCache;
    readonly gradients: GradientTextures;
    readonly options: EntityDrawingOptions;
};

// Builds what one entity draws into its Graphics, in the entity's own space. Each entity draws one
// thing: a path before a shape (text, v2, will come before both). Gives the GradientTextures key the
// drawing holds, which the caller lets go of once the Graphics is drawn again or destroyed.
export class EntityDrawing {
    static draw(graphics: Graphics, entity: Entity, parts: EntityDrawingParts): string | undefined {
        graphics.clear();
        graphics.alpha = 1;
        placeGraphics(graphics, undefined);

        const pathComponent = entity.getComponent(PathComponent);
        const shape = entity.getComponent(ShapeComponent);
        if (pathComponent === undefined && shape === undefined) return;

        const style = entity.getComponent(StyleComponent);
        // A shape with no style draws nothing here: UnstyledShapeOverlay shows it over the level.
        if (style === undefined && pathComponent === undefined) return;

        const look = lookOf(style, parts.options);
        if (look === undefined) return;

        graphics.alpha = look.opacity;

        const outlineStretch = look.stroke === undefined ? undefined : outlineStretchOf(entity);
        placeGraphics(graphics, outlineStretch?.unstretch);
        const pen = new Pen(graphics, outlineStretch?.stretch);

        let heldKey: string | undefined;
        const makeFill = () => {
            const place = { box: fillBoxOf(entity), stretch: outlineStretch?.stretch };
            const fill = PixiFill.of(look.fill, place, parts.gradients);
            heldKey = fill?.heldKey;
            return fill;
        };
        const context: DrawingContext = { graphics, pen, look, makeFill };

        if (pathComponent !== undefined) {
            drawPath(context, pathComponent);
            return heldKey;
        }

        if (shape === undefined) return undefined;

        const result = parts.pieces.piecesOf(entity);
        if (result === undefined) return undefined;

        drawShape(context, shape, result);
        return heldKey;
    }
}
