import { BodyComponent, SurfaceComponent } from '../../components/index.ts';
import type { PiecesCache, WorldMatrixCache } from '../../derived/index.ts';
import type { Entity } from '../../level/index.ts';
import { MassProperties } from '../../geometry/index.ts';

import { mergesInto, mergesUp } from '../merging/mergesInto.ts';
import { pixelsPerMetreOf } from '../scale/pixelsPerMetreOf.ts';

// One surface that belongs to a body: its density, and what it would weigh at density 1, in level positions.
export type BodySurface = {
    readonly entity: Entity;
    readonly density: number;
    readonly massAtDensityOne: number;
};

// The caches BodyMass reads: each shape's pieces and each entity's matrix.
export type BodyMassCaches = {
    readonly pieces: PiecesCache;
    readonly worldMatrices: WorldMatrixCache;
};

// The mass of a body: every surface that belongs to it, its own and the ones merged into it, added up in
// level positions at its World's Pixels per metre, so scaling the body or any shape in it changes the mass. The same pieces play collides
// with, so the Entity inspector's Mass matches play.
export class BodyMass {
    // undefined when the entity has no BodyComponent or merges into another body, since then it has no
    // mass of its own. A body without surfaces weighs 0 kg here; play gives a weightless Dynamic body 1 kg.
    static of(body: Entity, caches: BodyMassCaches) {
        if (!body.hasComponent(BodyComponent) || mergesInto(body) !== undefined) return undefined;

        const parts: MassProperties[] = [];
        addSurfaces(body, caches, pixelsPerMetreOf(body), parts);

        return MassProperties.combine(parts);
    }

    // The surfaces BodyMass adds up, for working out a density from a mass. Empty when the entity has no
    // BodyComponent or merges into another body.
    static surfacesOf(body: Entity, caches: BodyMassCaches) {
        const surfaces: BodySurface[] = [];
        if (!body.hasComponent(BodyComponent) || mergesInto(body) !== undefined) return surfaces;

        const pixelsPerMetre = pixelsPerMetreOf(body);

        forEachSurface(body, body, (entity) => {
            const surface = entity.getComponent(SurfaceComponent);
            const shape = caches.pieces.piecesOf(entity);
            if (surface === undefined || shape === undefined) return;

            const matrix = caches.worldMatrices.matrixOf(entity);
            const massAtDensityOne = MassProperties.of(shape.pieces, 1, pixelsPerMetre).transformedBy(matrix).mass;
            surfaces.push({ entity, density: surface.get('density'), massAtDensityOne });
        });

        return surfaces;
    }
}

function addSurfaces(body: Entity, caches: BodyMassCaches, pixelsPerMetre: number, parts: MassProperties[]) {
    forEachSurface(body, body, (each) => {
        const surface = surfaceMassOf(each, caches, pixelsPerMetre);
        if (surface !== undefined) {
            parts.push(surface);
        }
    });
}

// Walks the body's subtree, leaving out each body of its own (Merge unticked) with everything under it.
function forEachSurface(entity: Entity, body: Entity, visit: (entity: Entity) => void) {
    if (entity !== body && !mergesUp(entity)) return;

    visit(entity);

    for (const child of entity.children) {
        forEachSurface(child, body, visit);
    }
}

function surfaceMassOf(entity: Entity, caches: BodyMassCaches, pixelsPerMetre: number) {
    const surface = entity.getComponent(SurfaceComponent);
    const shape = caches.pieces.piecesOf(entity);
    if (surface === undefined || shape === undefined) return undefined;

    const ownMass = MassProperties.of(shape.pieces, surface.get('density'), pixelsPerMetre);

    return ownMass.transformedBy(caches.worldMatrices.matrixOf(entity));
}
