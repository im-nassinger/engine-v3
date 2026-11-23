import { Matrix2D } from '../../geometry/index.ts';
import type { Entity } from '../../level/index.ts';

import type { PlayRun } from '../run/PlayRun.ts';

// Where a body is now, measured from its parent, as its Transform's Position and Rotation say: the play
// copy's Transform keeps the values the run started with while physics moves the body. Undefined when the
// entity isn't a body in the run, or its parent's matrix can't be undone.
export function placementNow(entity: Entity, run: PlayRun) {
    const levelMatrix = run.bodyMatrices.matrixOf(entity);
    if (levelMatrix === undefined) return undefined;

    const fromParent = parentMatrixOf(entity, run).invert();
    if (fromParent === undefined) return undefined;

    return fromParent.multiply(levelMatrix).decompose();
}

export function parentMatrixOf(entity: Entity, run: PlayRun) {
    const parent = entity.parent;
    if (parent === undefined) return Matrix2D.identity();

    return run.caches.worldMatrices.matrixOf(parent);
}
