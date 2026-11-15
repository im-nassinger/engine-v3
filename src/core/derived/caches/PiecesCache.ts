import { ShapeComponent } from '../../components/index.ts';
import type { Entity, Level, LevelUpdate } from '../../level/index.ts';
import type { Unsubscribe } from '../../events/index.ts';
import type { ShapePiecesResult } from '../../geometry/index.ts';
import { ShapePieces } from '../../geometry/index.ts';

// The collision pieces and filled outlines of each shape, in its own space. Only a change to the
// ShapeComponent itself marks them, so moving, turning or regrouping a shape never cuts its polygon again.
// Unlike the matrix, the pieces don't depend on the parents, so each entity is marked on its own.
export class PiecesCache {
    private readonly results = new Map<Entity, ShapePiecesResult>();
    private readonly unsubscribe: Unsubscribe;

    constructor(level: Level) {
        this.unsubscribe = level.signals.updated.subscribe((update) => this.markStale(update));
    }

    // undefined when the entity has no ShapeComponent.
    piecesOf(entity: Entity) {
        const cached = this.results.get(entity);
        if (cached !== undefined) return cached;

        const shape = entity.getComponent(ShapeComponent);
        if (shape === undefined) return undefined;

        const geometry = shape.get('geometry');
        const result = ShapePieces.build(geometry);
        this.results.set(entity, result);

        return result;
    }

    get cachedCount() {
        return this.results.size;
    }

    dispose() {
        this.unsubscribe();
    }

    private markStale(update: LevelUpdate) {
        switch (update.kind) {
            case 'entityRemoved':
                this.results.delete(update.entity);
                return;
            case 'valueChanged':
            case 'componentAdded':
            case 'componentRemoved':
                if (update.component.schema !== ShapeComponent.schema) return;

                this.results.delete(update.entity);
                return;
            default:
                return;
        }
    }
}
