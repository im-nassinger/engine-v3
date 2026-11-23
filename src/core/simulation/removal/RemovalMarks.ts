import type { Entity } from '../../level/index.ts';

// Why an entity leaves the run: fully outside an open edge of the level bounds, a body past the hard
// limit, 100,000 px from the origin on either axis, or a Destroy action.
export type RemovalCause = 'openEdge' | 'pastHardLimit' | 'destroyed';

// The entities a tick's phases marked for removal, in the order they were marked, which EndOfTickPhase
// removes. An entity marked twice keeps its first cause.
export class RemovalMarks {
    private readonly causes = new Map<Entity, RemovalCause>();

    mark(entity: Entity, cause: RemovalCause) {
        if (this.causes.has(entity)) return;

        this.causes.set(entity, cause);
    }

    // Whether the entity, or a group above it, is marked, so it goes at the end of the tick.
    goes(entity: Entity) {
        for (let current: Entity | undefined = entity; current !== undefined; current = current.parent) {
            if (this.causes.has(current)) return true;
        }

        return false;
    }

    // Hands over the marks and starts again from none.
    take(): [Entity, RemovalCause][] {
        const marked = [...this.causes];
        this.causes.clear();

        return marked;
    }
}
