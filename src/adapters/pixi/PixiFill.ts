import { Matrix } from 'pixi.js';
import type { FillGradient, Graphics } from 'pixi.js';
import type { Fill, GradientFill } from '../../core/fields/index.ts';
import { Matrix2D } from '../../core/geometry/index.ts';
import type { Bounds } from '../../core/geometry/index.ts';
import type { GradientTextures } from './GradientTextures.ts';
import { toPixiColour } from './PixiColour.ts';
import type { PixiColour } from './PixiColour.ts';

// Where a fill is drawn: the entity's box, in its own space, and the stretch its drawing is traced with
// when Scale outline is off.
export type FillPlace = {
    readonly box: Bounds | undefined;
    readonly stretch: Matrix2D | undefined;
};

// From the gradient's unit space to the box's: start and end, or centre and radius, are shares of the box.
// A linear gradient's lines of one colour run square to start-to-end in shares, so in a box that isn't
// square they slant with it, as a radial gradient's circle stretches into an ellipse.
function unitToShares(fill: GradientFill) {
    if (fill.kind === 'radial') {
        const { centre, radius } = fill;
        return new Matrix2D(2 * radius, 0, 0, 2 * radius, centre.x - radius, centre.y - radius);
    }

    const along = { x: fill.end.x - fill.start.x, y: fill.end.y - fill.start.y };
    return new Matrix2D(along.x, along.y, -along.y, along.x, fill.start.x, fill.start.y);
}

// From the texture's pixels to where the drawing is traced: PixiJS reads a texture through the inverse.
// undefined when it can't be undone: an empty box, or a linear gradient whose start is its end.
function textureToDrawing(fill: GradientFill, gradient: FillGradient, place: FillPlace) {
    const box = place.box;
    if (box === undefined) return undefined;

    const source = gradient.texture.source;
    const pixelsToUnit = new Matrix2D(1 / source.width, 0, 0, 1 / source.height, 0, 0);
    const sharesToBox = new Matrix2D(box.width, 0, 0, box.height, box.left, box.top);
    const stretch = place.stretch ?? Matrix2D.identity();
    const matrix = stretch.multiply(sharesToBox).multiply(unitToShares(fill)).multiply(pixelsToUnit);
    if (matrix.determinant() === 0) return undefined;

    return new Matrix(matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty);
}

function lastColour(fill: GradientFill) {
    const last = fill.stops[fill.stops.length - 1];
    if (last === undefined) return undefined;

    return toPixiColour(last.colour);
}

// What one entity's Graphics.fill takes for its Fill: a colour, or a shared FillGradient placed on the
// entity's box by a matrix of its own. PixiJS's 'local' texture space is not used: it maps 0 to 1 onto
// each traced shape's bounds, not the whole fill's, and its linear gradient mirrors some directions. See
// tech-notes.md.
export class PixiFill {
    private readonly colour: PixiColour | undefined;
    private readonly gradient: FillGradient | undefined;
    private readonly matrix: Matrix | undefined;
    // The GradientTextures key this fill holds, which its entity lets go of when it is drawn again or goes.
    readonly heldKey: string | undefined;

    private constructor(colour: PixiColour | undefined, gradient?: FillGradient, matrix?: Matrix, heldKey?: string) {
        this.colour = colour;
        this.gradient = gradient;
        this.matrix = matrix;
        this.heldKey = heldKey;
    }

    // undefined for no fill.
    static of(fill: Fill, place: FillPlace, gradients: GradientTextures) {
        switch (fill.kind) {
            case 'none':
                return undefined;
            case 'solid':
                return new PixiFill(toPixiColour(fill.colour));
            default:
                return PixiFill.ofGradient(fill, place, gradients);
        }
    }

    // A gradient that can't be placed, its start on its end, shows its last stop, as a browser's does.
    private static ofGradient(fill: GradientFill, place: FillPlace, gradients: GradientTextures) {
        if (place.box === undefined) return undefined;

        const { key, gradient } = gradients.hold(fill);
        const matrix = textureToDrawing(fill, gradient, place);
        if (matrix === undefined) {
            gradients.letGo(key);
            return new PixiFill(lastColour(fill));
        }

        return new PixiFill(undefined, gradient, matrix, key);
    }

    // Fills what was traced. The shared FillGradient's matrix is set just before, because PixiJS keeps the
    // matrix object it finds there with this one fill.
    fill(graphics: Graphics) {
        if (this.gradient !== undefined) {
            this.gradient.transform = this.matrix ?? new Matrix();
            graphics.fill(this.gradient);
            return;
        }

        if (this.colour === undefined) return;

        graphics.fill(this.colour);
    }
}
