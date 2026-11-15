import type { Entity, EntityId, Level, LevelUpdate } from '../../core/entities/index.ts';
import { VersionCounter } from '../../core/events/index.ts';
import type { Unsubscribe } from '../../core/events/index.ts';

// The group you are inside: the World when you are inside nothing. Follows the level: when the group
// is removed, you land in its nearest parent that is left. Never saved and never undone itself.
export class CurrentGroup {
    readonly version = new VersionCounter();
    private readonly level: Level;
    private current: Entity;
    private readonly unsubscribe: Unsubscribe;

    constructor(level: Level) {
        this.level = level;
        this.current = level.world;
        this.unsubscribe = level.signals.updated.subscribe((update) => this.follow(update));
    }

    get group() {
        return this.current;
    }

    // The World first, down to the group: what a history step keeps for undo.
    get path(): readonly EntityId[] {
        const idsUpward: EntityId[] = [];
        let entity: Entity | undefined = this.current;

        while (entity !== undefined) {
            idsUpward.push(entity.id);
            entity = entity.parent;
        }

        return idsUpward.reverse();
    }

    enter(group: Entity) {
        const levelsEntity = this.level.findEntity(group.id);
        if (levelsEntity !== group) {
            throw new Error(`Entity ${group.id} is not in this level.`);
        }

        this.set(group);
    }

    // Esc: returns the group it left, which the caller selects. Undefined when already in the World.
    exitOne() {
        const left = this.current;
        const parent = left.parent;
        if (parent === undefined) return undefined;

        this.set(parent);

        return left;
    }

    // Undo: the deepest group on the path that still exists, or the World.
    restore(path: readonly EntityId[]) {
        for (let i = path.length - 1; i >= 0; i -= 1) {
            const id = path[i];
            if (id === undefined) continue;

            const entity = this.level.findEntity(id);
            if (entity === undefined) continue;

            this.set(entity);
            return;
        }

        this.set(this.level.world);
    }

    dispose() {
        this.unsubscribe();
    }

    // A subtree is removed children first, so each removal moves up one step while the parent still exists.
    private follow(update: LevelUpdate) {
        if (update.kind === 'entityRemoved' && update.entity === this.current) {
            this.set(update.formerParent);
            return;
        }

        if (update.kind === 'entityMoved') {
            const movedGroupOrParent = update.entity === this.current || update.entity.isAncestorOf(this.current);
            if (movedGroupOrParent) {
                this.version.increment();
            }
        }
    }

    private set(group: Entity) {
        if (group === this.current) return;

        this.current = group;
        this.version.increment();
    }
}
