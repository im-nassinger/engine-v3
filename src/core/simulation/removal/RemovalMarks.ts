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

    // Hands over the marks and starts again from none.
    take(): [Entity, RemovalCause][] {
        const marked = [...this.causes];
        this.causes.clear();

        return marked;
    }
}
