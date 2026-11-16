import { BodyComponent, ShapeComponent, SurfaceComponent } from '../../components/index.ts';
import type { Entity, Level } from '../../level/index.ts';
import { bodyOf } from '../merging/bodyOf.ts';
import { mergesInto } from '../merging/mergesInto.ts';

// Where play puts an entity's surface: into a body, into the Static ground when no body is on it or above
// it, or nowhere, for a line on a Dynamic body, which the editor refuses but a file edited by hand can hold.
export type SurfaceTarget =
    | { readonly kind: 'body'; readonly body: Entity }
    | { readonly kind: 'static' }
    | { readonly kind: 'skipped'; readonly reason: 'lineOnDynamicBody' };

const STATIC: SurfaceTarget = { kind: 'static' };
const LINE_ON_DYNAMIC_BODY: SurfaceTarget = { kind: 'skipped', reason: 'lineOnDynamicBody' };

// Which body each entity of one level belongs to in play, built on mergesInto. The World and the camera
// belong to none.
export class BodyMembership {
    private readonly level: Level;

    constructor(level: Level) {
        this.level = level;
    }

    // The body the entity moves with in play: the one it merges into, else its own. undefined for the
    // World, the camera and an entity with no body on it or above it.
    bodyOf(entity: Entity) {
        if (this.isWorldOrCamera(entity)) return undefined;

        return bodyOf(entity);
    }

    // True when play builds a body for the entity: it has a BodyComponent and doesn't merge into another.
    isBuiltBody(entity: Entity) {
        if (this.isWorldOrCamera(entity)) return false;

        return entity.hasComponent(BodyComponent) && mergesInto(entity) === undefined;
    }

    // Where the entity's surface goes in play. undefined for an entity without a SurfaceComponent, the
    // World and the camera.
    surfaceTargetOf(entity: Entity): SurfaceTarget | undefined {
        if (this.isWorldOrCamera(entity) || !entity.hasComponent(SurfaceComponent)) return undefined;

        const body = bodyOf(entity);
        if (body === undefined) return STATIC;
        if (isLine(entity) && body.getComponent(BodyComponent)?.get('type') === 'dynamic') {
            return LINE_ON_DYNAMIC_BODY;
        }

        return { kind: 'body', body };
    }

    private isWorldOrCamera(entity: Entity) {
        return entity === this.level.world || entity === this.level.camera;
    }
}

function isLine(entity: Entity) {
    return entity.getComponent(ShapeComponent)?.get('geometry').kind === 'line';
}
