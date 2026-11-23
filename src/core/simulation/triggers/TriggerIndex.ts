import { SurfaceComponent, TriggerComponent } from '../../components/index.ts';
import type { EntityId, Trigger, When } from '../../fields/index.ts';
import type { Entity, Level } from '../../level/index.ts';

// One trigger as the index lists it. Its When never changes in play, so it is read once; its on/off does,
// so that is read from the component when it is needed (triggerOf).
export type IndexedTrigger = {
    readonly owner: Entity;
    readonly triggerId: number;
    readonly when: When;
};

// The run's triggers by the kind of event they hear, each list in Entities viewer order, built when the run
// starts and kept as entities are removed, so no tick walks every trigger. A When with an unset part hears
// nothing and isn't listed. Touch and collision triggers are found from their entity.
export class TriggerIndex {
    private readonly level: Level;
    private levelStartList: IndexedTrigger[] = [];
    private keysAndInputsList: IndexedTrigger[] = [];
    private timersList: IndexedTrigger[] = [];
    private tagLeftList: IndexedTrigger[] = [];
    private readonly touchByOwner = new Map<Entity, IndexedTrigger[]>();
    // Each touch owner's place in Entities viewer order, to sort touches.
    private readonly touchPlace = new Map<Entity, number>();
    private readonly collisionByOwner = new Map<Entity, IndexedTrigger[]>();
    // Each collision owner's place in Entities viewer order, to sort hits.
    private readonly collisionPlace = new Map<Entity, number>();

    constructor(level: Level) {
        this.level = level;

        for (const owner of level.entitiesInPanelOrder()) {
            const triggers = owner.getComponent(TriggerComponent)?.get('triggers') ?? [];

            for (const trigger of triggers) {
                this.add(owner, trigger);
            }
        }
    }

    get levelStart(): readonly IndexedTrigger[] {
        return this.levelStartList;
    }

    get keysAndInputs(): readonly IndexedTrigger[] {
        return this.keysAndInputsList;
    }

    get timers(): readonly IndexedTrigger[] {
        return this.timersList;
    }

    get tagLeft(): readonly IndexedTrigger[] {
        return this.tagLeftList;
    }

    hearsTouch(entity: Entity) {
        return this.touchByOwner.has(entity);
    }

    // The entity's touched and no longer touched triggers, top to bottom in its card.
    touchTriggersOf(owner: Entity): readonly IndexedTrigger[] {
        return this.touchByOwner.get(owner) ?? [];
    }

    // Where a touch owner sits in Entities viewer order; an entity that hears no touch has no place.
    touchPlaceOf(owner: Entity) {
        return this.touchPlace.get(owner) ?? Number.POSITIVE_INFINITY;
    }

    hearsCollision(entity: Entity) {
        return this.collisionByOwner.has(entity);
    }

    // The entity's collision triggers, top to bottom in its card.
    collisionTriggersOf(owner: Entity): readonly IndexedTrigger[] {
        return this.collisionByOwner.get(owner) ?? [];
    }

    // Where a collision owner sits in Entities viewer order; an entity that hears no collision has no place.
    collisionPlaceOf(owner: Entity) {
        return this.collisionPlace.get(owner) ?? Number.POSITIVE_INFINITY;
    }

    // The surfaces whose shapes must send contact events: those whose entity, or a group above it, hears
    // collisions. Read when the run starts, before its physics is built; triggers can't be added in play.
    // A sensor is in it too, since Change value can make it solid.
    contactEventSurfaces() {
        const surfaces = new Set<EntityId>();
        if (this.collisionByOwner.size === 0) return surfaces;

        for (const entity of this.level.entitiesInPanelOrder()) {
            if (!entity.hasComponent(SurfaceComponent)) continue;
            if (!this.hearsCollisionAtOrAbove(entity)) continue;

            surfaces.add(entity.id);
        }

        return surfaces;
    }

    // The removed entities' triggers hear nothing more.
    forget(removed: ReadonlySet<Entity>) {
        const stays = (indexed: IndexedTrigger) => !removed.has(indexed.owner);

        this.levelStartList = this.levelStartList.filter(stays);
        this.keysAndInputsList = this.keysAndInputsList.filter(stays);
        this.timersList = this.timersList.filter(stays);
        this.tagLeftList = this.tagLeftList.filter(stays);

        for (const entity of removed) {
            this.touchByOwner.delete(entity);
            this.touchPlace.delete(entity);
            this.collisionByOwner.delete(entity);
            this.collisionPlace.delete(entity);
        }
    }

    private add(owner: Entity, trigger: Trigger) {
        const when = trigger.when;
        if (when === null || !isWhenSet(when)) return;

        const indexed = { owner, triggerId: trigger.id, when };

        switch (when.kind) {
            case 'levelStart':
                this.levelStartList.push(indexed);
                return;
            case 'key':
            case 'input':
                this.keysAndInputsList.push(indexed);
                return;
            case 'after':
            case 'every':
                this.timersList.push(indexed);
                return;
            case 'tagLeft':
                this.tagLeftList.push(indexed);
                return;
            case 'touched':
            case 'untouched':
                addByOwner(this.touchByOwner, this.touchPlace, indexed);
                return;
            case 'collision':
                addByOwner(this.collisionByOwner, this.collisionPlace, indexed);
                return;
        }
    }

    private hearsCollisionAtOrAbove(entity: Entity) {
        for (let current: Entity | undefined = entity; current !== undefined; current = current.parent) {
            if (this.hearsCollision(current)) return true;
        }

        return false;
    }
}

function addByOwner(byOwner: Map<Entity, IndexedTrigger[]>, places: Map<Entity, number>, indexed: IndexedTrigger) {
    const ownTriggers = byOwner.get(indexed.owner);
    if (ownTriggers !== undefined) {
        ownTriggers.push(indexed);
        return;
    }

    byOwner.set(indexed.owner, [indexed]);
    places.set(indexed.owner, places.size);
}

// The trigger now, as its component holds it, or undefined once it is gone.
export function triggerOf(indexed: IndexedTrigger) {
    const triggers = indexed.owner.getComponent(TriggerComponent)?.get('triggers') ?? [];

    return triggers.find((trigger) => trigger.id === indexed.triggerId);
}

function isWhenSet(when: When) {
    switch (when.kind) {
        case 'key':
            return when.key !== null;
        case 'input':
            return when.input !== null;
        case 'after':
        case 'every':
            return when.seconds !== null;
        case 'tagLeft':
            return when.tag !== null;
        default:
            return true;
    }
}
