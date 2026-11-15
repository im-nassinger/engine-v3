import type { Entity, EntityId, Level, LevelUpdate } from '../../core/entities/index.ts';
import { VersionCounter } from '../../core/events/index.ts';
import type { Unsubscribe } from '../../core/events/index.ts';

// The selected entities, in the order they were selected. Never an entity together with one of its
// parents, and the World only alone. Follows the level: a removed entity leaves the selection.
// Never saved and never undone itself: undo puts back the ids its history step kept.
export class Selection {
    readonly version = new VersionCounter();
    private readonly level: Level;
    private selected: readonly Entity[] = [];
    private readonly unsubscribe: Unsubscribe;

    constructor(level: Level) {
        this.level = level;
        this.unsubscribe = level.signals.updated.subscribe((update) => this.follow(update));
    }

    get ids(): readonly EntityId[] {
        return this.selected.map((entity) => entity.id);
    }

    get entities(): readonly Entity[] {
        return this.selected;
    }

    get isEmpty() {
        return this.selected.length === 0;
    }

    has(id: EntityId) {
        return this.selected.some((entity) => entity.id === id);
    }

    // One batch: a parent wins over its children, and the World is dropped when anything else is in it.
    replace(ids: readonly EntityId[]) {
        const entities = this.requireEntities(ids);
        const withoutRepeats = [...new Set(entities)];
        const hasOthersThanTheWorld = withoutRepeats.some((entity) => entity !== this.level.world);

        let candidates = withoutRepeats;
        if (hasOthersThanTheWorld) {
            candidates = withoutRepeats.filter((entity) => entity !== this.level.world);
        }

        const parentsOnly = keepParentsOverChildren(candidates);
        this.set(parentsOnly);
    }

    // One at a time, the newest winning: adding a parent drops its selected children, adding a child
    // drops its selected parent, adding the World selects it alone, and adding anything else drops the World.
    add(ids: readonly EntityId[]) {
        const entities = this.requireEntities(ids);
        let next = this.selected;

        for (const entity of entities) {
            next = addNewest(next, entity, this.level.world);
        }

        this.set(next);
    }

    // Shift+click: drops the entity when it is selected, adds it otherwise.
    toggle(id: EntityId) {
        const entity = this.level.requireEntity(id);
        const isSelected = this.selected.includes(entity);

        if (!isSelected) {
            this.add([id]);
            return;
        }

        const withoutEntity = this.selected.filter((selected) => selected !== entity);
        this.set(withoutEntity);
    }

    clear() {
        this.set([]);
    }

    dispose() {
        this.unsubscribe();
    }

    private follow(update: LevelUpdate) {
        if (update.kind === 'entityRemoved') {
            const remaining = this.selected.filter((entity) => entity !== update.entity);
            this.set(remaining);
            return;
        }

        // A move can put a selected entity inside another selected one: the parent wins, as in replace.
        if (update.kind === 'entityMoved') {
            const parentsOnly = keepParentsOverChildren(this.selected);
            this.set(parentsOnly);
        }
    }

    private requireEntities(ids: readonly EntityId[]) {
        return ids.map((id) => this.level.requireEntity(id));
    }

    private set(next: readonly Entity[]) {
        const isSame = next.length === this.selected.length && next.every((entity, i) => entity === this.selected[i]);
        if (isSame) return;

        this.selected = next;
        this.version.increment();
    }
}

// Walks up from each entity rather than comparing every pair, so selecting 10,000 entities stays fast.
function keepParentsOverChildren(entities: readonly Entity[]) {
    const inSet = new Set(entities);

    return entities.filter((entity) => !hasAncestorIn(entity, inSet));
}

function hasAncestorIn(entity: Entity, entities: ReadonlySet<Entity>) {
    let parent = entity.parent;

    while (parent !== undefined) {
        if (entities.has(parent)) return true;
        parent = parent.parent;
    }

    return false;
}

function addNewest(selected: readonly Entity[], entity: Entity, world: Entity) {
    if (selected.includes(entity)) return selected;
    if (entity === world) return [world];

    const kept = selected.filter((other) => {
        const isRelated = other.isAncestorOf(entity) || entity.isAncestorOf(other);

        return other !== world && !isRelated;
    });

    return [...kept, entity];
}
