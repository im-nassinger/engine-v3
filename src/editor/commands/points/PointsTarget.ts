import { PathComponent, ShapeComponent } from '../../../core/components/index.ts';
import type { Matrix2D, PathGeometry, PathPoint, Point } from '../../../core/geometry/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import type { ValueTarget } from '../../history/index.ts';
import type { OpenLevel } from '../../session/index.ts';

import { editablePointsOf, isJointPath } from './editablePoints.ts';
import type { EditablePoints, PointsKind } from './editablePoints.ts';

// The most points a ShapeComponent holds (LevelLimits' maxShapePoints) and a path (maxPathPoints).
const MAX_SHAPE_POINTS = 1_000;
const MAX_PATH_POINTS = 2_000;

export type { PointsKind };

export type PointsRefusal = { readonly kind: 'refused'; readonly reason: string };

// The fewest points each kind keeps, and how a delete below it is refused.
const MIN_POINTS = {
    polygon: { count: 3, reason: 'A polygon keeps at least 3 points' },
    line: { count: 2, reason: 'A line keeps at least 2 points' },
    openPath: { count: 2, reason: 'A path keeps at least 2 points' },
    closedPath: { count: 3, reason: 'A closed path keeps at least 3 points' },
} as const;

function isPathPoint(point: Point): point is PathPoint {
    return 'corner' in point;
}

function asPathPoint(point: Point): PathPoint {
    if (isPathPoint(point)) return point;

    return { x: point.x, y: point.y, handleIn: null, handleOut: null, corner: 'sharp' };
}

// An open path's first point has no handle in and its last no handle out, whichever points they now are.
function withOpenEnds(points: readonly PathPoint[]) {
    const last = points.length - 1;

    return points.map((point, index) => {
        const dropsIn = index === 0 && point.handleIn !== null;
        const dropsOut = index === last && point.handleOut !== null;
        if (!dropsIn && !dropsOut) return point;

        return { ...point, handleIn: dropsIn ? null : point.handleIn, handleOut: dropsOut ? null : point.handleOut };
    });
}

// A polygon's, line's or path's points as the point edits read them: in its own space, with its level
// matrix turned around, so a position under the mouse becomes a point under a rotated, scaled or skewed
// parent. A path point carries its handles, which are measured from it. Each edit writes the geometry
// through LiveEdit, which the edit begins with `target`.
export class PointsTarget {
    readonly entity: Entity;
    readonly kind: PointsKind;
    readonly closed: boolean;
    readonly points: readonly Point[];
    readonly target: ValueTarget;
    // The path's points with their handles; empty for a polygon or line.
    readonly pathPoints: readonly PathPoint[];
    private readonly levelMatrix: Matrix2D;
    private readonly inverse: Matrix2D;

    private constructor(entity: Entity, editable: EditablePoints, levelMatrix: Matrix2D, inverse: Matrix2D) {
        this.entity = entity;
        this.kind = editable.kind;
        this.closed = editable.closed;
        this.points = editable.points;
        this.pathPoints = editable.kind === 'path' ? editable.points : [];
        this.levelMatrix = levelMatrix;
        this.inverse = inverse;
        this.target =
            editable.kind === 'path'
                ? { entityId: entity.id, schema: PathComponent.schema, key: 'path' }
                : { entityId: entity.id, schema: ShapeComponent.schema, key: 'geometry' };
    }

    static of(openLevel: OpenLevel, entity: Entity): PointsTarget | PointsRefusal {
        if (openLevel.liveEdit.isActive) return { kind: 'refused', reason: 'Not during a drag' };
        if (openLevel.caches.hidden.isLocked(entity)) return { kind: 'refused', reason: "Locked entities don't move" };
        if (isJointPath(entity)) return { kind: 'refused', reason: "A Rope's or Spring's path follows its joint" };

        const editable = editablePointsOf(entity);
        if (editable === undefined) return { kind: 'refused', reason: 'Only a polygon, a line or a path has points' };

        const levelMatrix = openLevel.caches.worldMatrices.matrixOf(entity);
        const inverse = levelMatrix.invert();
        if (inverse === undefined) return { kind: 'refused', reason: 'Nothing here can move' };

        return new PointsTarget(entity, editable, levelMatrix, inverse);
    }

    get isPath() {
        return this.kind === 'path';
    }

    get minPoints() {
        return this.minRule().count;
    }

    get minPointsReason() {
        return this.minRule().reason;
    }

    get maxPoints() {
        return this.isPath ? MAX_PATH_POINTS : MAX_SHAPE_POINTS;
    }

    get maxPointsReason() {
        return this.isPath ? 'A path holds at most 2,000 points' : `A ${this.kind} holds at most 1,000 points`;
    }

    toLevel(point: Point) {
        return this.levelMatrix.apply(point);
    }

    toOwn(levelPosition: Point) {
        return this.inverse.apply(levelPosition);
    }

    // The value holding these points, of the same kind. A path's points keep their handles; a plain point
    // given to a path becomes sharp.
    geometryWith(points: readonly Point[]) {
        if (!this.isPath) return { kind: this.kind, points };

        const pathPoints = points.map(asPathPoint);
        const path: PathGeometry = { closed: this.closed, points: this.closed ? pathPoints : withOpenEnds(pathPoints) };

        return path;
    }

    // Writes the points and makes one step from what the geometry held before. False, with nothing
    // written, when the level is read-only or refuses the points.
    write(openLevel: OpenLevel, points: readonly Point[], label: string, joinKey?: string) {
        const { liveEdit } = openLevel;
        if (!liveEdit.begin([this.target])) return false;

        const written = liveEdit.update(this.target, this.geometryWith(points));
        if (!written.ok) {
            liveEdit.cancel();
            return false;
        }
        liveEdit.commit(label, joinKey);

        return true;
    }

    private minRule() {
        if (this.kind === 'polygon' || this.kind === 'line') return MIN_POINTS[this.kind];

        return this.closed ? MIN_POINTS.closedPath : MIN_POINTS.openPath;
    }
}

export function isPointsRefusal(value: PointsTarget | PointsRefusal): value is PointsRefusal {
    return !(value instanceof PointsTarget);
}
