import type { Matrix2D } from './Matrix2D.ts';
import type { Point } from './Point.ts';

// An axis-aligned rectangle in level positions, y pointing down, so top is the smaller y.
// Bounds are values: every operation returns a new one.
export class Bounds {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;

    constructor(left: number, top: number, right: number, bottom: number) {
        this.left = left;
        this.top = top;
        this.right = right;
        this.bottom = bottom;
    }

    // undefined for no points, because nothing has no bounds.
    static around(points: readonly Point[]) {
        if (points.length === 0) return undefined;

        let left = Infinity;
        let top = Infinity;
        let right = -Infinity;
        let bottom = -Infinity;

        for (const point of points) {
            left = Math.min(left, point.x);
            top = Math.min(top, point.y);
            right = Math.max(right, point.x);
            bottom = Math.max(bottom, point.y);
        }

        return new Bounds(left, top, right, bottom);
    }

    get width() {
        return this.right - this.left;
    }

    get height() {
        return this.bottom - this.top;
    }

    get centre(): Point {
        const x = (this.left + this.right) / 2;
        const y = (this.top + this.bottom) / 2;

        return { x, y };
    }

    corners(): Point[] {
        return [
            { x: this.left, y: this.top },
            { x: this.right, y: this.top },
            { x: this.right, y: this.bottom },
            { x: this.left, y: this.bottom },
        ];
    }

    union(other: Bounds) {
        const left = Math.min(this.left, other.left);
        const top = Math.min(this.top, other.top);
        const right = Math.max(this.right, other.right);
        const bottom = Math.max(this.bottom, other.bottom);

        return new Bounds(left, top, right, bottom);
    }

    // Grows every side by the margin, as half an outline's width does.
    expandedBy(margin: number) {
        return new Bounds(this.left - margin, this.top - margin, this.right + margin, this.bottom + margin);
    }

    // Touching edges count as overlapping, so a box that just reaches an entity selects it.
    overlaps(other: Bounds) {
        const apartHorizontally = other.left > this.right || other.right < this.left;
        const apartVertically = other.top > this.bottom || other.bottom < this.top;

        return !apartHorizontally && !apartVertically;
    }

    contains(point: Point) {
        const insideHorizontally = point.x >= this.left && point.x <= this.right;
        const insideVertically = point.y >= this.top && point.y <= this.bottom;

        return insideHorizontally && insideVertically;
    }

    // The bounds of this rectangle after the matrix, which can be larger than the shape's own
    // bounds after the matrix when it rotates.
    transformedBy(matrix: Matrix2D) {
        const movedCorners = this.corners().map((corner) => matrix.apply(corner));

        return Bounds.around(movedCorners) ?? this;
    }
}
