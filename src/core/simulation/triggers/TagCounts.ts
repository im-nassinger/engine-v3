import { TagsComponent } from '../../components/index.ts';
import type { Entity, Level } from '../../level/index.ts';

// How many entities in the run hold each tag, and the tags whose last entity left or lost them since they
// were last taken, for "no entity with this tag is left". A tag no entity ever held never runs out.
export class TagCounts {
    private readonly counts = new Map<string, number>();
    private runOut: string[] = [];

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
        if (count === 1 && !this.runOut.includes(tag)) {
            this.runOut.push(tag);
        }
    }

    // The removed entities' tags leave with them.
    forget(removed: Iterable<Entity>) {
        for (const entity of removed) {
            for (const tag of tagsOf(entity)) {
                this.tagRemoved(tag);
            }
        }
    }

    // The tags that ran out, in the order they did, leaving out any held again since.
    takeRunOut() {
        const stillOut = this.runOut.filter((tag) => this.count(tag) === 0);
        this.runOut = [];

        return stillOut;
    }
}

function tagsOf(entity: Entity) {
    return entity.getComponent(TagsComponent)?.get('tags') ?? [];
}
