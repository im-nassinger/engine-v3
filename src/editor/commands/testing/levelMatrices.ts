import type { Matrix2D } from '../../../core/geometry/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import type { EditorSession } from '../../session/index.ts';

export function levelMatrixOf(session: EditorSession, entity: Entity) {
    return session.openLevel.caches.worldMatrices.matrixOf(entity);
}

// The largest difference between the two matrices' numbers: near 0 when an entity was kept in place on screen.
export function matrixDifference(first: Matrix2D, second: Matrix2D) {
    const differences = [
        first.a - second.a,
        first.b - second.b,
        first.c - second.c,
        first.d - second.d,
        first.tx - second.tx,
        first.ty - second.ty,
    ];
    const sizes = differences.map((difference) => Math.abs(difference));

    return Math.max(...sizes);
}
