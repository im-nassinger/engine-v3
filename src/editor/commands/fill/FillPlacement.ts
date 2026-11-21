import { fillBoxOf } from '../../../core/derived/index.ts';
import type { Bounds, Matrix2D, Point } from '../../../core/geometry/index.ts';
import type { Entity } from '../../../core/level/index.ts';

// Where an entity's fill lies: its box in its own space, the box a fill's positions are shares of, and the
// matrix from that space to level positions. Turns shares of the box into level positions and back.
export class FillPlacement {
    readonly box: Bounds;
    readonly toLevel: Matrix2D;
    private readonly fromLevel: Matrix2D;

    private constructor(box: Bounds, toLevel: Matrix2D, fromLevel: Matrix2D) {
        this.box = box;
        this.toLevel = toLevel;
        this.fromLevel = fromLevel;
    }

    // undefined for an entity with no box, a box with no width or height, or a matrix flattened to a line,
    // where shares can't be told apart.
    static of(entity: Entity, toLevel: Matrix2D): FillPlacement | undefined {
        const box = fillBoxOf(entity);
        if (box === undefined || box.width === 0 || box.height === 0) return undefined;

        const fromLevel = toLevel.invert();
        if (fromLevel === undefined) return undefined;

        return new FillPlacement(box, toLevel, fromLevel);
    }

    // A share of the box in the entity's own space.
    shareToOwn(share: Point): Point {
        return { x: this.box.left + share.x * this.box.width, y: this.box.top + share.y * this.box.height };
    }

    shareToLevel(share: Point): Point {
        return this.toLevel.apply(this.shareToOwn(share));
    }

    levelToShare(levelPosition: Point): Point {
        const own = this.fromLevel.apply(levelPosition);

        return { x: (own.x - this.box.left) / this.box.width, y: (own.y - this.box.top) / this.box.height };
    }
}
