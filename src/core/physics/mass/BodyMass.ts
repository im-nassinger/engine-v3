import { BodyComponent, SurfaceComponent } from '../../components/index.ts';
import type { PiecesCache, WorldMatrixCache } from '../../derived/index.ts';
import type { Entity } from '../../level/index.ts';
import { MassProperties } from '../../geometry/index.ts';

import { mergesInto, mergesUp } from '../merging/mergesInto.ts';

// The caches BodyMass reads: each shape's pieces and each entity's matrix.
export type BodyMassCaches = {
    readonly pieces: PiecesCache;
    readonly worldMatrices: WorldMatrixCache;
};

// The mass of a body: every surface that belongs to it, its own and the ones merged into it, added up in
// level positions, so scaling the body or any shape in it changes the mass. The same pieces play collides
// with, so the Entity inspector's Mass matches play.
export class BodyMass {
    // undefined when the entity has no BodyComponent or merges into another body, since then it has no
    // mass of its own. A body without surfaces weighs 0 kg here; play gives a weightless Dynamic body 1 kg.
    static of(body: Entity, caches: BodyMassCaches) {
        if (!body.hasComponent(BodyComponent) || mergesInto(body) !== undefined) return undefined;

        const parts: MassProperties[] = [];
        addSurfaces(body, body, caches, parts);

        return MassProperties.combine(parts);
    }
}

// Walks the body's subtree, leaving out each body of its own (Merge unticked) with everything under it.
function addSurfaces(entity: Entity, body: Entity, caches: BodyMassCaches, parts: MassProperties[]) {
    if (entity !== body && !mergesUp(entity)) return;

    const surface = surfaceMassOf(entity, caches);
    if (surface !== undefined) {
        parts.push(surface);
    }

    for (const child of entity.children) {
        addSurfaces(child, body, caches, parts);
    }
}

function surfaceMassOf(entity: Entity, caches: BodyMassCaches) {
    const surface = entity.getComponent(SurfaceComponent);
    const shape = caches.pieces.piecesOf(entity);
    if (surface === undefined || shape === undefined) return undefined;

    const ownMass = MassProperties.of(shape.pieces, surface.get('density'));

    return ownMass.transformedBy(caches.worldMatrices.matrixOf(entity));
}
