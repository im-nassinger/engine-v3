import {
    CameraComponent,
    PathComponent,
    ShapeComponent,
    StyleComponent,
    TransformComponent,
} from '../components/index.ts';
import type { AnyComponentSchema } from '../components/index.ts';
import type { Entity, Level, LevelUpdate } from '../entities/index.ts';
import type { Unsubscribe } from '../events/index.ts';
import type { Bounds } from '../geometry/index.ts';
import { OwnBounds } from './OwnBounds.ts';
import type { WorldMatrixCache } from './WorldMatrixCache.ts';

// Wrapped, so that "draws nothing" can be kept and told apart from "not worked out yet".
type KnownBounds = {
    readonly bounds: Bounds | undefined;
};

const SCHEMAS_OF_WHAT_IS_DRAWN: readonly AnyComponentSchema[] = [
    ShapeComponent.schema,
    PathComponent.schema,
    StyleComponent.schema,
    CameraComponent.schema,
];

// Each entity's own bounds in level positions, and the bounds of its subtree: its own and all its
// descendants'. Lazy, like WorldMatrixCache, whose matrices it reads. Hidden entities keep their bounds;
// whoever asks also asks HiddenCache.
export class BoundsCache {
    private readonly worldMatrices: WorldMatrixCache;
    private readonly ownBounds = new Map<Entity, KnownBounds>();
    // A subtree's value is stored only after all its children's, so when an entity has none, none of its
    // parents has one either, and marking upwards stops there.
    private readonly subtreeBounds = new Map<Entity, KnownBounds>();
    private readonly unsubscribe: Unsubscribe;

    // The WorldMatrixCache must be the same level's.
    constructor(level: Level, worldMatrices: WorldMatrixCache) {
        this.worldMatrices = worldMatrices;
        this.unsubscribe = level.signals.updated.subscribe((update) => this.markStale(update));
    }

    // undefined when the entity draws nothing.
    ownBoundsOf(entity: Entity) {
        const cached = this.ownBounds.get(entity);
        if (cached !== undefined) return cached.bounds;

        const matrix = this.worldMatrices.matrixOf(entity);
        const bounds = OwnBounds.of(entity, matrix);
        this.ownBounds.set(entity, { bounds });

        return bounds;
    }

    // undefined when nothing in the subtree draws anything.
    subtreeBoundsOf(entity: Entity): Bounds | undefined {
        const cached = this.subtreeBounds.get(entity);
        if (cached !== undefined) return cached.bounds;

        let bounds = this.ownBoundsOf(entity);

        for (const child of entity.children) {
            const childBounds = this.subtreeBoundsOf(child);
            if (childBounds === undefined) continue;

            if (bounds === undefined) {
                bounds = childBounds;
            } else {
                bounds = bounds.union(childBounds);
            }
        }

        this.subtreeBounds.set(entity, { bounds });
        return bounds;
    }

    get cachedCount() {
        return this.ownBounds.size + this.subtreeBounds.size;
    }

    dispose() {
        this.unsubscribe();
    }

    private markStale(update: LevelUpdate) {
        switch (update.kind) {
            case 'entityAdded':
                this.markParentsOf(update.entity);
                return;
            case 'entityRemoved':
                this.ownBounds.delete(update.entity);
                this.subtreeBounds.delete(update.entity);
                this.markWithParents(update.formerParent);
                return;
            case 'entityMoved':
                this.markMoved(update.entity);
                this.markWithParents(update.formerParent);
                this.markParentsOf(update.entity);
                return;
            case 'valueChanged':
            case 'componentAdded':
            case 'componentRemoved':
                this.markComponentChange(update.entity, update.component.schema);
                return;
            default:
                return;
        }
    }

    private markComponentChange(entity: Entity, schema: AnyComponentSchema) {
        if (schema === TransformComponent.schema) {
            this.markMoved(entity);
            this.markParentsOf(entity);
            return;
        }

        if (!SCHEMAS_OF_WHAT_IS_DRAWN.includes(schema)) return;

        this.ownBounds.delete(entity);
        this.markWithParents(entity);
    }

    // Its matrix and every descendant's changed, so every own bounds in the subtree is stale.
    private markMoved(entity: Entity) {
        this.ownBounds.delete(entity);
        this.subtreeBounds.delete(entity);

        for (const child of entity.children) {
            this.markMoved(child);
        }
    }

    private markWithParents(entity: Entity) {
        let current: Entity | undefined = entity;

        while (current !== undefined) {
            const hadValue = this.subtreeBounds.delete(current);
            if (!hadValue) return;

            current = current.parent;
        }
    }

    private markParentsOf(entity: Entity) {
        const parent = entity.parent;
        if (parent === undefined) return;

        this.markWithParents(parent);
    }
}
