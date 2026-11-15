import { DeterministicMath } from '../math/index.ts';

import type { Point } from './Point.ts';
import type { TransformValues } from './TransformValues.ts';

const DEGREES_PER_RADIAN = 180 / Math.PI;

// Adding 0 turns -0 into 0, so a decomposed value never shows as -0.
function withoutNegativeZero(value: number) {
    return value + 0;
}

// A half turn is shown as 180, never -180, so rotations come back between -180 and 180, 180 included.
function rotationInDegrees(radians: number) {
    const degrees = radians * DEGREES_PER_RADIAN;
    if (degrees === -180) return 180;

    return withoutNegativeZero(degrees);
}

// Maps (x, y) to (a x + c y + tx, b x + d y + ty), the layout of the canvas and of Pixi.
export class Matrix2D {
    readonly a: number;
    readonly b: number;
    readonly c: number;
    readonly d: number;
    readonly tx: number;
    readonly ty: number;

    constructor(a: number, b: number, c: number, d: number, tx: number, ty: number) {
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
        this.tx = tx;
        this.ty = ty;
    }

    static identity() {
        return new Matrix2D(1, 0, 0, 1, 0, 0);
    }

    // T(position) * R(rotation) * K(skew) * S(scale), where K slants horizontally by tan(skew).
    static fromTransform(values: TransformValues) {
        const rotation = DeterministicMath.sinCos(values.rotation);
        const skew = DeterministicMath.sinCos(values.skew);
        const skewTangent = skew.sin / skew.cos;

        const a = rotation.cos * values.scale.x;
        const b = rotation.sin * values.scale.x;
        const c = values.scale.y * (rotation.cos * skewTangent - rotation.sin);
        const d = values.scale.y * (rotation.sin * skewTangent + rotation.cos);

        return new Matrix2D(a, b, c, d, values.position.x, values.position.y);
    }

    // this * other: applies other first, then this. A child's level matrix is parent.multiply(child).
    multiply(other: Matrix2D) {
        const a = this.a * other.a + this.c * other.b;
        const b = this.b * other.a + this.d * other.b;
        const c = this.a * other.c + this.c * other.d;
        const d = this.b * other.c + this.d * other.d;
        const tx = this.a * other.tx + this.c * other.ty + this.tx;
        const ty = this.b * other.tx + this.d * other.ty + this.ty;

        return new Matrix2D(a, b, c, d, tx, ty);
    }

    invert() {
        const determinant = this.determinant();
        if (determinant === 0) return undefined;

        const a = this.d / determinant;
        const b = -this.b / determinant;
        const c = -this.c / determinant;
        const d = this.a / determinant;
        const tx = (this.c * this.ty - this.d * this.tx) / determinant;
        const ty = (this.b * this.tx - this.a * this.ty) / determinant;

        return new Matrix2D(a, b, c, d, tx, ty);
    }

    apply(point: Point): Point {
        const x = this.a * point.x + this.c * point.y + this.tx;
        const y = this.b * point.x + this.d * point.y + this.ty;

        return { x, y };
    }

    determinant() {
        return this.a * this.d - this.b * this.c;
    }

    // How far the matrix can stretch a length of 1, in its most stretched direction: the larger singular
    // value. An outline of width w is at most w times this wide after the matrix.
    largestStretch() {
        const squaresSum = this.a * this.a + this.b * this.b + this.c * this.c + this.d * this.d;
        const determinant = this.determinant();
        const discriminant = squaresSum * squaresSum - 4 * determinant * determinant;
        const spread = Math.sqrt(Math.max(discriminant, 0));

        return Math.sqrt((squaresSum + spread) / 2);
    }

    // The inverse of fromTransform. The x scale comes back positive, so a mirror shows as a
    // negative y scale. The rotation comes back above -180 and at most 180, the skew strictly
    // between -90 and 90.
    decompose(): TransformValues {
        const position = { x: withoutNegativeZero(this.tx), y: withoutNegativeZero(this.ty) };

        const scaleX = Math.sqrt(this.a * this.a + this.b * this.b);
        const determinant = this.determinant();
        const cannotBeSplit = scaleX === 0 || determinant === 0;

        if (cannotBeSplit) {
            return { position, rotation: 0, scale: { x: scaleX, y: 0 }, skew: 0 };
        }

        const rotationRadians = DeterministicMath.atan2(this.b, this.a);
        const scaleY = determinant / scaleX;

        const columnsDot = this.a * this.c + this.b * this.d;
        const skewTangent = columnsDot / determinant;
        const skewRadians = DeterministicMath.atan2(skewTangent, 1);

        const rotation = rotationInDegrees(rotationRadians);
        const skew = withoutNegativeZero(skewRadians * DEGREES_PER_RADIAN);
        const scale = { x: scaleX, y: withoutNegativeZero(scaleY) };

        return { position, rotation, scale, skew };
    }
}
