import type { Entity, Level, LevelUpdate } from '../../entities/index.ts';
import type { Unsubscribe } from '../../events/index.ts';

import { PerEntityValues } from './PerEntityValues.ts';

type Switches = {
    readonly hidden: boolean;
    readonly locked: boolean;
};

// Whether an entity or any of its parents is hidden, and the same for locked. Lazy, like WorldMatrixCache.
export class HiddenCache {
    private readonly switches = new PerEntityValues<Switches>();
    private readonly unsubscribe: Unsubscribe;

    constructor(level: Level) {
        this.unsubscribe = level.signals.updated.subscribe((update) => this.markStale(update));
    }

    isHidden(entity: Entity) {
        const switches = this.switchesOf(entity);

        return switches.hidden;
    }

    isLocked(entity: Entity) {
        const switches = this.switchesOf(entity);

        return switches.locked;
    }

    get cachedCount() {
        return this.switches.size;
    }

    dispose() {
        this.unsubscribe();
    }

    private switchesOf(entity: Entity): Switches {
        const cached = this.switches.find(entity);
        if (cached !== undefined) return cached;

        let hidden = entity.isHidden;
        let locked = entity.isLocked;
        const parent = entity.parent;

        if (parent !== undefined) {
            const parentSwitches = this.switchesOf(parent);
            hidden = hidden || parentSwitches.hidden;
            locked = locked || parentSwitches.locked;
        }

        const switches = { hidden, locked };
        this.switches.store(entity, switches);

        return switches;
    }

    private markStale(update: LevelUpdate) {
        switch (update.kind) {
            case 'switchChanged':
            case 'entityMoved':
                this.switches.markSubtree(update.entity);
                return;
            case 'entityRemoved':
                this.switches.forget(update.entity);
                return;
            default:
                return;
        }
    }
}
