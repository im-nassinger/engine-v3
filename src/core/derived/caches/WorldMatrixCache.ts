import { TransformComponent } from '../../components/index.ts';
import type { Entity, Level, LevelUpdate } from '../../level/index.ts';
import type { Unsubscribe } from '../../events/index.ts';
import { Matrix2D } from '../../geometry/index.ts';

import { PerEntityValues } from './PerEntityValues.ts';

// Each entity's matrix from its own space to level positions. Marking is cheap and computing is lazy:
// a change marks the subtree, and a matrix is worked out only when asked for.
export class WorldMatrixCache {
    private readonly matrices = new PerEntityValues<Matrix2D>();
    private readonly unsubscribe: Unsubscribe;

    constructor(level: Level) {
        this.unsubscribe = level.signals.updated.subscribe((update) => this.markStale(update));
    }

    matrixOf(entity: Entity): Matrix2D {
        const cached = this.matrices.find(entity);
        if (cached !== undefined) return cached;

        const ownMatrix = this.ownMatrixOf(entity);
        const parent = entity.parent;
        let matrix = ownMatrix;

        if (parent !== undefined) {
            const parentMatrix = this.matrixOf(parent);
            matrix = parentMatrix.multiply(ownMatrix);
        }

        this.matrices.store(entity, matrix);

        return matrix;
    }

    get cachedCount() {
        return this.matrices.size;
    }

    dispose() {
        this.unsubscribe();
    }

    private ownMatrixOf(entity: Entity) {
        const transform = entity.getComponent(TransformComponent);
        if (transform === undefined) return Matrix2D.identity();

        const values = {
            position: transform.get('position'),
            rotation: transform.get('rotation'),
            scale: transform.get('scale'),
            skew: transform.get('skew'),
        };

        return Matrix2D.fromTransform(values);
    }

    private markStale(update: LevelUpdate) {
        switch (update.kind) {
            case 'entityMoved':
                this.matrices.markSubtree(update.entity);
                return;
            case 'entityRemoved':
                this.matrices.forget(update.entity);
                return;
            case 'valueChanged':
            case 'componentAdded':
            case 'componentRemoved':
                if (update.component.schema !== TransformComponent.schema) return;
                this.matrices.markSubtree(update.entity);
                return;
            default:
                return;
        }
    }
}
