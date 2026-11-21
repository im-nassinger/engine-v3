import type { Point } from '../../../core/geometry/index.ts';
import { labelName } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import type { OpenLevel } from '../../session/index.ts';

import { isPointsRefusal, PointsTarget } from './PointsTarget.ts';
import type { PointsRefusal } from './PointsTarget.ts';

// The code a drag and a nudge of points share: the given points moved by an offset in level positions,
// so each follows the mouse on screen whatever the shape's and its parents' rotation, scale and skew.
// Each write goes through LiveEdit, which the caller begins with `targets` first.
export class PointsMove {
    readonly label: string;
    private readonly openLevel: OpenLevel;
    private readonly points: PointsTarget;
    private readonly movedIndexes: ReadonlySet<number>;

    private constructor(openLevel: OpenLevel, points: PointsTarget, movedIndexes: ReadonlySet<number>) {
        this.openLevel = openLevel;
        this.points = points;
        this.movedIndexes = movedIndexes;
        this.label = `Move points of ${labelName(points.entity)}`;
    }

    static of(openLevel: OpenLevel, entity: Entity, indexes: readonly number[]): PointsMove | PointsRefusal {
        const points = PointsTarget.of(openLevel, entity);
        if (isPointsRefusal(points)) return points;

        const count = points.points.length;
        const existing = indexes.filter((index) => index >= 0 && index < count);
        if (existing.length === 0) return { kind: 'refused', reason: 'No points selected' };

        return new PointsMove(openLevel, points, new Set(existing));
    }

    get targets() {
        return [this.points.target];
    }

    // Where a point was in the level before anything moved.
    startLevelPosition(index: number) {
        const point = this.points.points[index];
        if (point === undefined) return undefined;

        return this.points.toLevel(point);
    }

    moveBy(offset: Point) {
        const moved = this.points.points.map((point, index) => {
            if (!this.movedIndexes.has(index)) return point;

            const start = this.points.toLevel(point);
            const levelPosition = { x: start.x + offset.x, y: start.y + offset.y };

            // A path point carries its handles, which are measured from it.
            return { ...point, ...this.points.toOwn(levelPosition) };
        });
        const geometry = this.points.geometryWith(moved);

        this.openLevel.liveEdit.update(this.points.target, geometry);
    }
}
