import { PathComponent } from '../../../core/components/index.ts';
import type { PathGeometry, PathPoint } from '../../../core/geometry/index.ts';
import type { Entity, EntityId } from '../../../core/level/index.ts';
import { extendRefusal } from '../../commands/index.ts';
import type { OpenLevel } from '../../session/index.ts';

import type { GroupSpace } from './penPoints.ts';

// The open path the pen was picked with, as it is now: its points in its own space, and that space.
export type KeptPath = {
    readonly entity: Entity;
    readonly path: PathGeometry;
    readonly space: GroupSpace;
};

// A drawing that continues a kept path: the drawing starts with the path's own points, reversed when it
// went on from the first end, so new points are always added at the end.
export type ContinuedPath = {
    readonly entity: Entity;
    readonly ownCount: number;
    readonly reversed: boolean;
};

// The one open path selected, when the pen can continue it: not a Rope's or Spring's, not locked or in a
// locked group, and in a space with an inverse.
export function keptPathOf(openLevel: OpenLevel, id: EntityId): KeptPath | undefined {
    const ids = openLevel.selection.ids;
    if (ids.length !== 1 || ids[0] !== id) return undefined;

    const entity = openLevel.level.findEntity(id);
    if (entity === undefined) return undefined;

    const path = entity.getComponent(PathComponent)?.get('path');
    if (path === undefined || path.closed) return undefined;
    if (extendRefusal(openLevel, entity) !== undefined) return undefined;

    const toLevel = openLevel.caches.worldMatrices.matrixOf(entity);
    const toGroup = toLevel.invert();
    if (toGroup === undefined) return undefined;

    return { entity, path, space: { toLevel, toGroup } };
}

// The selection's one entity, when it is a path the pen can continue.
export function keptIdOf(openLevel: OpenLevel) {
    const [id] = openLevel.selection.ids;
    if (id === undefined) return undefined;
    if (keptPathOf(openLevel, id) === undefined) return undefined;

    return id;
}

// The same curves the other way round: the points in reverse order, each one's handles swapped.
export function reversedPoints(points: readonly PathPoint[]) {
    const reversed: PathPoint[] = [];
    for (let index = points.length - 1; index >= 0; index -= 1) {
        const point = points[index];
        if (point === undefined) continue;

        reversed.push({ ...point, handleIn: point.handleOut, handleOut: point.handleIn });
    }

    return reversed;
}

// The drawing's path in the stored order. An open path drawn from its first end is reversed back, so its
// new points come before its own. A closed one is also turned so the path's own first point stays first.
export function inStoredOrder(path: PathGeometry, continued: ContinuedPath): PathGeometry {
    if (!continued.reversed) return path;

    const points = reversedPoints(path.points);
    if (!path.closed) return { closed: false, points };

    const newCount = points.length - continued.ownCount;
    const turned = [...points.slice(newCount), ...points.slice(0, newCount)];

    return { closed: true, points: turned };
}
