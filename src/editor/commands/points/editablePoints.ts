import { JointComponent, PathComponent, ShapeComponent } from '../../../core/components/index.ts';
import type { PathGeometry, Point } from '../../../core/geometry/index.ts';
import type { Entity } from '../../../core/level/index.ts';

export type PointsKind = 'polygon' | 'line' | 'path';

// The points an entity's point editing works on, in its own space: a polygon's or line's, or a path's
// with their handles. A polygon and a closed path join their last point back to the first.
export type EditablePoints =
    | { readonly kind: 'polygon' | 'line'; readonly closed: boolean; readonly points: readonly Point[] }
    | {
          readonly kind: 'path';
          readonly closed: boolean;
          readonly points: PathGeometry['points'];
          readonly path: PathGeometry;
      };

// A Rope's or Spring's path follows its joint's ends, so it has no points to edit.
export function isJointPath(entity: Entity) {
    return entity.hasComponent(PathComponent) && entity.hasComponent(JointComponent);
}

// undefined for an entity whose points can't be edited: a rectangle, a circle, a Rope's or Spring's path,
// or anything else.
export function editablePointsOf(entity: Entity): EditablePoints | undefined {
    const geometry = entity.getComponent(ShapeComponent)?.get('geometry');
    if (geometry?.kind === 'polygon') return { kind: 'polygon', closed: true, points: geometry.points };
    if (geometry?.kind === 'line') return { kind: 'line', closed: false, points: geometry.points };

    const path = entity.getComponent(PathComponent)?.get('path');
    if (path === undefined || isJointPath(entity)) return undefined;

    return { kind: 'path', closed: path.closed, points: path.points, path };
}
