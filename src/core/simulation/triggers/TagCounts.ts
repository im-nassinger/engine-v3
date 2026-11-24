import { TagsComponent } from '../../components/index.ts';
import type { Entity, Level } from '../../level/index.ts';

// How many entities in the run hold each tag, so a tag nobody holds is known without walking the level.
export class TagCounts {
    private readonly counts = new Map<string, number>();

    constructor(level: Level) {
        for (const entity of level.entitiesInPanelOrder()) {
            for (const tag of tagsOf(entity)) {
                this.tagAdded(tag);
            }
        }
    }

    count(tag: string) {
        return this.counts.get(tag) ?? 0;
    }

    tagAdded(tag: string) {
        const count = this.count(tag);
        this.counts.set(tag, count + 1);
    }

    tagRemoved(tag: string) {
        const count = this.count(tag);
        if (count === 0) return;

        this.counts.set(tag, count - 1);
    }

    // The removed entities' tags leave with them.
    forget(removed: Iterable<Entity>) {
        for (const entity of removed) {
            for (const tag of tagsOf(entity)) {
                this.tagRemoved(tag);
            }
        }
    }
}

function tagsOf(entity: Entity) {
    return entity.getComponent(TagsComponent)?.get('tags') ?? [];
}
