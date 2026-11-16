import { ShapeComponent } from '../../../core/components/index.ts';
import type { Matrix2D, Point } from '../../../core/geometry/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import type { ValueTarget } from '../../history/index.ts';
import type { OpenLevel } from '../../session/index.ts';

// The fewest points each kind keeps, and the most a ShapeComponent holds (LevelLimits' maxPoints).
const MIN_POLYGON_POINTS = 3;
const MIN_LINE_POINTS = 2;
const MAX_POINTS = 1_000;

export type PointsKind = 'polygon' | 'line';

export type PointsRefusal = { readonly kind: 'refused'; readonly reason: string };

// A polygon's or line's points as the point edits read them: in its own space, with its level matrix
// turned around, so a position under the mouse becomes a point under a rotated, scaled or skewed parent.
// Each edit writes the geometry through LiveEdit, which the edit begins with `target`.
export class PointsTarget {
    readonly entity: Entity;
    readonly kind: PointsKind;
    readonly points: readonly Point[];
    readonly target: ValueTarget;
    private readonly levelMatrix: Matrix2D;
    private readonly inverse: Matrix2D;

    private constructor(
        entity: Entity,
        kind: PointsKind,
        points: readonly Point[],
        levelMatrix: Matrix2D,
        inverse: Matrix2D,
    ) {
        this.entity = entity;
        this.kind = kind;
        this.points = points;
        this.levelMatrix = levelMatrix;
        this.inverse = inverse;
        this.target = { entityId: entity.id, schema: ShapeComponent.schema, key: 'geometry' };
    }

    static of(openLevel: OpenLevel, entity: Entity): PointsTarget | PointsRefusal {
        if (openLevel.liveEdit.isActive) return { kind: 'refused', reason: 'Not during a drag' };
        if (openLevel.caches.hidden.isLocked(entity)) return { kind: 'refused', reason: "Locked entities don't move" };

        const geometry = entity.getComponent(ShapeComponent)?.get('geometry');
        const hasPoints = geometry?.kind === 'polygon' || geometry?.kind === 'line';
        if (!hasPoints) return { kind: 'refused', reason: 'Only a polygon or a line has points' };

        const levelMatrix = openLevel.caches.worldMatrices.matrixOf(entity);
        const inverse = levelMatrix.invert();
        if (inverse === undefined) return { kind: 'refused', reason: 'Nothing here can move' };

        return new PointsTarget(entity, geometry.kind, geometry.points, levelMatrix, inverse);
    }

    get minPoints() {
        return this.kind === 'polygon' ? MIN_POLYGON_POINTS : MIN_LINE_POINTS;
    }

    get maxPoints() {
        return MAX_POINTS;
    }

    toLevel(point: Point) {
        return this.levelMatrix.apply(point);
    }

    toOwn(levelPosition: Point) {
        return this.inverse.apply(levelPosition);
    }

    // The geometry holding these points, of the same kind.
    geometryWith(points: readonly Point[]) {
        return { kind: this.kind, points };
    }

    // Writes the points and makes one step from what the geometry held before.
    write(openLevel: OpenLevel, points: readonly Point[], label: string, joinKey?: string) {
        const { liveEdit } = openLevel;
        liveEdit.begin([this.target]);
        liveEdit.update(this.target, this.geometryWith(points));
        liveEdit.commit(label, joinKey);
    }
}

export function isPointsRefusal(value: PointsTarget | PointsRefusal): value is PointsRefusal {
    return !(value instanceof PointsTarget);
}
