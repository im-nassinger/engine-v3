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
// nothing and isn't listed. Touch, collision and Destroyed triggers are found from their entity, custom event
// triggers from their name and then their entity, "a variable changes" triggers from the level's variable's
// name, or from their entity and then their own variable's name.
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
    private readonly destroyedByOwner = new Map<Entity, IndexedTrigger[]>();
    private readonly customByName = new Map<string, Map<Entity, IndexedTrigger[]>>();
    private readonly levelVariableByName = new Map<string, IndexedTrigger[]>();
    private readonly ownVariableByOwner = new Map<Entity, IndexedTrigger[]>();

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

    // The entity's Destroyed triggers, top to bottom in its card.
    destroyedTriggersOf(owner: Entity): readonly IndexedTrigger[] {
        return this.destroyedByOwner.get(owner) ?? [];
    }

    // The entity's triggers hearing the custom event of this name, top to bottom in its card. A name nobody
    // hears is one lookup.
    customTriggersOf(owner: Entity, name: string): readonly IndexedTrigger[] {
        return this.customByName.get(name)?.get(owner) ?? [];
    }

    // The triggers on any entity hearing the level's variable of this name change, in Entities viewer order.
    levelVariableTriggersOf(name: string): readonly IndexedTrigger[] {
        return this.levelVariableByName.get(name) ?? [];
    }

    // The entity's triggers hearing its own variable of this name change, top to bottom in its card.
    ownVariableTriggersOf(owner: Entity, name: string): readonly IndexedTrigger[] {
        const ownTriggers = this.ownVariableByOwner.get(owner) ?? [];

        return ownTriggers.filter((indexed) => variableNameOf(indexed.when) === name);
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
            this.destroyedByOwner.delete(entity);

            this.ownVariableByOwner.delete(entity);

            for (const byOwner of this.customByName.values()) {
                byOwner.delete(entity);
            }
        }

        for (const [name, listening] of this.levelVariableByName) {
            this.levelVariableByName.set(name, listening.filter(stays));
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
            case 'destroyed':
                addTo(this.destroyedByOwner, indexed);
                return;
            case 'custom':
                if (when.name === null) return;
                addTo(this.customOwnersOf(when.name), indexed);
                return;
            case 'variableChanged':
                this.addVariableChanged(indexed, when);
                return;
        }
    }

    // The World's own variables are the level's, so a World trigger naming one as its own hears it as the
    // level's.
    private addVariableChanged(indexed: IndexedTrigger, when: VariableChangedWhen) {
        const { variable } = when;
        if (variable === null) return;

        const isWorld = indexed.owner === this.level.world;
        if (variable.owner === 'own' && !isWorld) {
            addTo(this.ownVariableByOwner, indexed);
            return;
        }

        const listening = this.levelVariableByName.get(variable.name);
        if (listening !== undefined) {
            listening.push(indexed);
            return;
        }

        this.levelVariableByName.set(variable.name, [indexed]);
    }

    private customOwnersOf(name: string) {
        const found = this.customByName.get(name);
        if (found !== undefined) return found;

        const byOwner = new Map<Entity, IndexedTrigger[]>();
        this.customByName.set(name, byOwner);

        return byOwner;
    }

    private hearsCollisionAtOrAbove(entity: Entity) {
        for (let current: Entity | undefined = entity; current !== undefined; current = current.parent) {
            if (this.hearsCollision(current)) return true;
        }

        return false;
    }
}

type VariableChangedWhen = When & { readonly kind: 'variableChanged' };

function variableNameOf(when: When) {
    return when.kind === 'variableChanged' ? when.variable?.name : undefined;
}

function addTo(byOwner: Map<Entity, IndexedTrigger[]>, indexed: IndexedTrigger) {
    const ownTriggers = byOwner.get(indexed.owner);
    if (ownTriggers !== undefined) {
        ownTriggers.push(indexed);
        return;
    }

    byOwner.set(indexed.owner, [indexed]);
}

function addByOwner(byOwner: Map<Entity, IndexedTrigger[]>, places: Map<Entity, number>, indexed: IndexedTrigger) {
    if (!places.has(indexed.owner)) {
        places.set(indexed.owner, places.size);
    }

    addTo(byOwner, indexed);
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
        case 'custom':
            return when.name !== null;
        case 'variableChanged':
            return when.variable !== null;
        default:
            return true;
    }
}
